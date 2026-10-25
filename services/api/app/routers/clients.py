from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership, verify_org_admin
from app.models.models import Client, Profile
from app.schemas.client import ClientRead, ClientCreate, ClientUpdate

router = APIRouter(prefix="/api/organizations/{organization_id}/clients", tags=["Clients"])


@router.get("", response_model=List[ClientRead])
async def list_clients(
    organization_id: str,
    search: Optional[str] = Query(None, description="Search by client name or contact person"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists clients belonging strictly to the specified organization.
    Supports Unicode search (English, Marathi, Hindi).
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = select(Client).where(Client.organization_id == organization_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Client.name.ilike(term),
                Client.contact_person.ilike(term),
                Client.phone.ilike(term),
                Client.email.ilike(term),
            )
        )

    query = query.order_by(Client.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
async def create_client(
    organization_id: str,
    client_in: ClientCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new client inside the specified organization.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    new_client = Client(
        organization_id=organization_id,
        name=client_in.name.strip(),
        contact_person=client_in.contact_person.strip() if client_in.contact_person else None,
        email=client_in.email.strip() if client_in.email else None,
        phone=client_in.phone.strip() if client_in.phone else None,
        billing_address=client_in.billing_address.strip() if client_in.billing_address else None,
        gstin=client_in.gstin.strip().upper() if client_in.gstin else None,
    )
    db.add(new_client)
    await db.commit()
    await db.refresh(new_client)
    return new_client


@router.get("/{client_id}", response_model=ClientRead)
async def get_client(
    organization_id: str,
    client_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves client profile. Enforces organization boundary.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.organization_id == organization_id
        )
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in this organization")
    return client


@router.patch("/{client_id}", response_model=ClientRead)
async def update_client(
    organization_id: str,
    client_id: str,
    client_in: ClientUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates client details. Enforces organization boundary.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.organization_id == organization_id
        )
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in this organization")

    update_data = client_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            val = val.strip()
            if field == "gstin":
                val = val.upper()
        setattr(client, field, val)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    organization_id: str,
    client_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes client. Requires admin or owner role in organization.
    """
    await verify_org_admin(organization_id, current_user.id, db)

    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.organization_id == organization_id
        )
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in this organization")

    await db.delete(client)
    await db.commit()
    return None
