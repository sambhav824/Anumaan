"""
Location and Reverse-Geocoding Router for Anumaan.
Supports browser-initiated device geolocation, reverse-geocoding coordinates to Indian
City, District, State, and PIN code, and mapping to regional construction Schedule of Rates (SOR).
"""

from typing import Optional
from decimal import Decimal
import logging
import urllib.request
import urllib.parse
import json
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/geolocation", tags=["Geolocation & Regional Mapping"])


class ReverseGeocodeResponse(BaseModel):
    display_name: str
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    latitude: float
    longitude: float
    suggested_region_id: str
    region_name: str
    authority: str
    source_doc: str
    is_fallback: bool = False
    notes: Optional[str] = None


def resolve_indian_region(state: Optional[str], city: Optional[str]) -> dict:
    """
    Maps detected state and city to authoritative regional construction rate benchmarks.
    """
    st = (state or "").lower().strip()
    ct = (city or "").lower().strip()

    if "maharashtra" in st or ct in ("palghar", "mumbai", "pune", "nagpur", "nashik", "thane", "aurangabad", "chhatrapati sambhajinagar", "kolhapur", "solapur", "navi mumbai"):
        return {
            "suggested_region_id": "maharashtra_pwd",
            "region_name": "Maharashtra (Mumbai / Pune MMR)",
            "authority": "Maharashtra Public Works Department (PWD)",
            "source_doc": "Maharashtra PWD CSR 2023-2024 / SSR",
        }
    elif "karnataka" in st or ct in ("bengaluru", "bangalore", "mysuru", "mysore", "hubballi", "dharwad", "mangaluru", "mangalore", "belagavi"):
        return {
            "suggested_region_id": "karnataka_pwd",
            "region_name": "Karnataka (Bengaluru Region)",
            "authority": "Karnataka Public Works Department (PWD)",
            "source_doc": "Karnataka PWD Schedule of Rates 2023-2024",
        }
    else:
        # National CPWD Delhi Benchmark fallback
        return {
            "suggested_region_id": "national_cpwd",
            "region_name": "National (CPWD Delhi Benchmark)",
            "authority": "Central Public Works Department (CPWD)",
            "source_doc": "CPWD Delhi Schedule of Rates (DSR 2023 / 2024)",
        }


def offline_indian_bounding_box(lat: float, lon: float) -> dict:
    """
    Deterministic offline approximation when reverse-geocoding API is unreachable or times out.
    Covers major Indian states and metropolitan coordinates.
    """
    # Maharashtra / Mumbai / Pune approx box
    if 15.6 <= lat <= 22.0 and 72.6 <= lon <= 80.9:
        if 18.3 <= lat <= 19.3 and 72.7 <= lon <= 73.2:
            return {"city": "Mumbai", "district": "Mumbai Suburban", "state": "Maharashtra", "pincode": "400001"}
        elif 18.3 <= lat <= 18.8 and 73.7 <= lon <= 74.1:
            return {"city": "Pune", "district": "Pune", "state": "Maharashtra", "pincode": "411001"}
        return {"city": "Maharashtra Region", "district": "Maharashtra", "state": "Maharashtra", "pincode": ""}

    # Karnataka / Bengaluru approx box
    elif 11.5 <= lat <= 18.5 and 74.0 <= lon <= 78.6:
        if 12.8 <= lat <= 13.2 and 77.4 <= lon <= 77.8:
            return {"city": "Bengaluru", "district": "Bengaluru Urban", "state": "Karnataka", "pincode": "560001"}
        return {"city": "Karnataka Region", "district": "Karnataka", "state": "Karnataka", "pincode": ""}

    # Delhi NCR approx box
    elif 28.3 <= lat <= 28.9 and 76.8 <= lon <= 77.4:
        return {"city": "New Delhi", "district": "Central Delhi", "state": "Delhi", "pincode": "110001"}

    # General India
    elif 8.0 <= lat <= 37.0 and 68.0 <= lon <= 97.5:
        return {"city": "Identified Location", "district": "", "state": "National / India", "pincode": ""}

    return {"city": "Location", "district": "", "state": "India", "pincode": ""}


@router.get("/reverse", response_model=ReverseGeocodeResponse)
async def reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude from device Geolocation API"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude from device Geolocation API"),
):
    """
    Reverse geocodes GPS coordinates to Indian administrative units and maps to official SOR benchmarks.
    Never continuously tracks devices. Invoked on explicit user action only.
    """
    # Try Nominatim reverse geocode with standard headers and timeout
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=14&addressdetails=1"
    headers = {
        "User-Agent": "Anumaan-Construction-Estimation/0.1.0 (https://anumaan.in; contact@anumaan.in)"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            addr = data.get("address", {})

            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("municipality")
                or addr.get("suburb")
            )
            district = addr.get("county") or addr.get("state_district") or addr.get("district")
            state = addr.get("state")
            pincode = addr.get("postcode")
            display_name = data.get("display_name", f"{lat:.4f}, {lon:.4f}")

            region_info = resolve_indian_region(state, city)

            return ReverseGeocodeResponse(
                display_name=display_name,
                city=city,
                district=district,
                state=state,
                pincode=pincode,
                country=addr.get("country", "India"),
                latitude=lat,
                longitude=lon,
                suggested_region_id=region_info["suggested_region_id"],
                region_name=region_info["region_name"],
                authority=region_info["authority"],
                source_doc=region_info["source_doc"],
                is_fallback=False,
                notes="GPS coordinates confirmed via OpenStreetMap reverse geocoding.",
            )

    except Exception as exc:
        logger.warning(f"Reverse geocode remote API failed or timed out: {exc}. Using deterministic regional fallback.")
        offline_loc = offline_indian_bounding_box(lat, lon)
        region_info = resolve_indian_region(offline_loc["state"], offline_loc["city"])

        return ReverseGeocodeResponse(
            display_name=f"{offline_loc['city']}, {offline_loc['state']} ({lat:.4f}, {lon:.4f})",
            city=offline_loc["city"],
            district=offline_loc["district"],
            state=offline_loc["state"],
            pincode=offline_loc["pincode"],
            country="India",
            latitude=lat,
            longitude=lon,
            suggested_region_id=region_info["suggested_region_id"],
            region_name=region_info["region_name"],
            authority=region_info["authority"],
            source_doc=region_info["source_doc"],
            is_fallback=True,
            notes="Offline regional coordinates mapping applied. Contractor can edit city and state manually.",
        )
