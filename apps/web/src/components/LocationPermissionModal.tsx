"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "@/context/I18nContext";
import { api, ReverseGeocodeResult } from "@/lib/api";

export interface UserLocationPreference {
  city: string;
  district: string;
  state: string;
  regionId: string;
  regionName: string;
  source: "gps" | "manual";
  timestamp: string;
}

interface LocationPermissionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLocationSelected?: (location: UserLocationPreference) => void;
  forceShow?: boolean;
}

const COMMON_REGIONS = [
  {
    state: "Maharashtra",
    cities: ["Palghar", "Mumbai", "Pune", "Thane", "Navi Mumbai", "Nagpur", "Nashik"],
    regionId: "maharashtra_pwd",
    regionName: "Maharashtra (Palghar / Mumbai MMR / Pune)",
  },
  {
    state: "Karnataka",
    cities: ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi"],
    regionId: "karnataka_pwd",
    regionName: "Karnataka (Bengaluru Region)",
  },
  {
    state: "Delhi NCR / National",
    cities: ["New Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad"],
    regionId: "national_cpwd",
    regionName: "National (CPWD Delhi Benchmark)",
  },
  {
    state: "Gujarat",
    cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    regionId: "national_cpwd",
    regionName: "Gujarat / National Benchmark",
  },
  {
    state: "Rajasthan",
    cities: ["Jaipur", "Jodhpur", "Kota", "Udaipur"],
    regionId: "national_cpwd",
    regionName: "Rajasthan / National Benchmark",
  },
];

export function getUserSavedLocation(): UserLocationPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("anumaan_user_location");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserLocation(loc: UserLocationPreference) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("anumaan_user_location", JSON.stringify(loc));
    localStorage.setItem("anumaan_location_decision", loc.source);
    // Dispatch storage event for real-time sync across components
    window.dispatchEvent(new Event("anumaan_location_changed"));
  } catch {}
}

export default function LocationPermissionModal({
  isOpen: propIsOpen,
  onClose,
  onLocationSelected,
  forceShow = false,
}: LocationPermissionModalProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"prompt" | "manual" | "detecting">("prompt");
  const [selectedState, setSelectedState] = useState(COMMON_REGIONS[0].state);
  const [manualCity, setManualCity] = useState("Palghar");
  const [detectingError, setDetectingError] = useState<string | null>(null);

  // Check if user has already made a decision after login
  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }

    if (typeof window === "undefined") return;
    const decision = localStorage.getItem("anumaan_location_decision");
    if (!decision) {
      // Small timeout so user sees dashboard first without jarring popup
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Sync prop control if provided
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("anumaan_location_decision", "dismissed");
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleGpsPermission = () => {
    if (!navigator.geolocation) {
      setDetectingError("Geolocation is not supported by your browser. Please select your location manually.");
      setView("manual");
      return;
    }

    setView("detecting");
    setDetectingError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await api.reverseGeocode(lat, lon);

          const pref: UserLocationPreference = {
            city: res.city || "Identified Location",
            district: res.district || res.city || "",
            state: res.state || "National",
            regionId: res.suggested_region_id || "national_cpwd",
            regionName: res.region_name || "National (CPWD Delhi Benchmark)",
            source: "gps",
            timestamp: new Date().toISOString(),
          };

          saveUserLocation(pref);
          onLocationSelected?.(pref);
          setIsOpen(false);
          onClose?.();
        } catch (err: any) {
          console.warn("Geocoding failed, falling back to manual selection:", err);
          setDetectingError("Could not resolve location coordinates. Please choose your city or state below.");
          setView("manual");
        }
      },
      (error) => {
        console.warn("Geolocation permission error:", error.message);
        if (typeof window !== "undefined") {
          localStorage.setItem("anumaan_location_decision", "denied");
        }
        setDetectingError("Location access was denied or timed out. You can easily choose your construction market manually.");
        setView("manual");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleManualSave = () => {
    const regionObj = COMMON_REGIONS.find((r) => r.state === selectedState) || COMMON_REGIONS[0];
    const pref: UserLocationPreference = {
      city: manualCity.trim() || regionObj.cities[0],
      district: manualCity.trim() || regionObj.cities[0],
      state: regionObj.state,
      regionId: regionObj.regionId,
      regionName: regionObj.regionName,
      source: "manual",
      timestamp: new Date().toISOString(),
    };

    saveUserLocation(pref);
    onLocationSelected?.(pref);
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#DCE4EE] shadow-2xl overflow-hidden font-sans text-[#263445] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Ribbon */}
        <div className="bg-[#102F57] text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <MapPin className="w-6 h-6 text-[#F7931E]" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Find construction material prices near you
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Location-aware pricing & Schedule of Rates
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROMPT VIEW */}
        {view === "prompt" && (
          <div className="p-6 space-y-5">
            <p className="text-xs text-[#64748B] leading-relaxed">
              Allow Anumaan to use your location to find relevant construction material prices in your area and help you prepare more accurate project estimates.
            </p>

            <div className="space-y-2.5 bg-[#F3F6FA] p-4 rounded-xl border border-[#DCE4EE] text-xs">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16835D] shrink-0 mt-0.5" />
                <span className="text-[#263445]">
                  Regional material rates for Cement, Sand, TMT Steel, Bricks, and Tiles.
                </span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16835D] shrink-0 mt-0.5" />
                <span className="text-[#263445]">
                  Mapped directly to state PWD CSR (Maharashtra, Karnataka, CPWD).
                </span>
              </div>
              <div className="flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#102F57] shrink-0 mt-0.5" />
                <span className="text-[#64748B] text-[11px]">
                  Foreground lookup only. Your precise GPS coordinates are never publicly shared or stored.
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleGpsPermission}
                className="w-full py-2.5 px-4 bg-[#102F57] hover:bg-[#0c2444] text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <Navigation className="w-4 h-4 text-[#F7931E]" />
                <span>Allow Location Access</span>
              </button>

              <button
                onClick={() => setView("manual")}
                className="w-full py-2.5 px-4 bg-white border border-[#DCE4EE] hover:bg-[#F3F6FA] text-[#102F57] rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Building2 className="w-4 h-4 text-[#64748B]" />
                <span>Enter Location Manually</span>
              </button>

              <div className="text-center pt-1">
                <button
                  onClick={handleDismiss}
                  className="text-xs text-[#64748B] hover:text-[#102F57] transition font-medium"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETECTING SPINNER VIEW */}
        {view === "detecting" && (
          <div className="p-10 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#DCE4EE] border-t-[#102F57] rounded-full animate-spin mx-auto"></div>
            <div>
              <h4 className="font-bold text-sm text-[#102F57]">Detecting construction market...</h4>
              <p className="text-xs text-[#64748B] mt-1">
                Resolving your district and mapping regional construction schedule of rates.
              </p>
            </div>
          </div>
        )}

        {/* MANUAL LOCATION SELECTION VIEW */}
        {view === "manual" && (
          <div className="p-6 space-y-4">
            {detectingError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{detectingError}</span>
              </div>
            )}

            <p className="text-xs text-[#64748B]">
              Select your construction state and city to calibrate material prices for your local market:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                  State / Benchmark Region
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const st = e.target.value;
                    setSelectedState(st);
                    const matched = COMMON_REGIONS.find((r) => r.state === st);
                    if (matched) setManualCity(matched.cities[0]);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4EE] rounded-xl text-xs text-[#263445] font-medium focus:ring-2 focus:ring-[#102F57]"
                >
                  {COMMON_REGIONS.map((r) => (
                    <option key={r.state} value={r.state}>
                      {r.state} ({r.regionName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#263445] uppercase tracking-wider mb-1">
                  City / District / Taluka
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {(COMMON_REGIONS.find((r) => r.state === selectedState)?.cities || []).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setManualCity(ct)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition ${
                        manualCity === ct
                          ? "bg-[#102F57] text-white border-[#102F57]"
                          : "bg-[#F3F6FA] text-[#263445] border-[#DCE4EE] hover:bg-[#E8EEF5]"
                      }`}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter city name (e.g. Palghar, Vasai, Pune)..."
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE4EE] rounded-xl text-xs text-[#263445] focus:ring-2 focus:ring-[#102F57]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#DCE4EE]">
              <button
                type="button"
                onClick={() => setView("prompt")}
                className="text-xs text-[#64748B] hover:text-[#102F57] font-medium"
              >
                ← Back
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:bg-[#F3F6FA] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="px-4 py-2 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] font-bold text-xs rounded-xl transition shadow-xs flex items-center space-x-1"
                >
                  <span>Apply Location</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

