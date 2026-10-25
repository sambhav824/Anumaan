from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership, verify_org_admin
from app.models.models import Organization, OrganizationMember, Profile
from app.schemas.organization import (
    OrganizationRead,
    OrganizationCreate,
    OrganizationUpdate,
    MemberRead,
)

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])


@router.get("", response_model=List[OrganizationRead])
async def list_user_organizations(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all organizations where the authenticated user has active membership.
    Never returns organizations the user doesn't belong to.
    """
    query = (
        select(Organization, OrganizationMember.role)
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(Organization.name)
    )
    result = await db.execute(query)
    rows = result.all()

    orgs = []
    for org, role in rows:
        org_dict = OrganizationRead.model_validate(org)
        org_dict.user_role = role
        orgs.append(org_dict)
    return orgs


@router.post("", response_model=OrganizationRead)
async def create_organization(
    org_in: OrganizationCreate,
    response: Response,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new organization and assigns current user as the 'owner'.
    Assigns created_by to current_user.id.
    If an organization with the same (created_by, lower(name)) already exists,
    catches IntegrityError, rolls back, and returns the EXISTING organization with HTTP 200 OK.
    """
    user_id = current_user.id
    user_full_name = current_user.full_name
    normalized_name = org_in.name

    new_org = Organization(
        name=normalized_name,
        owner_person=org_in.owner_person.strip() if org_in.owner_person else user_full_name,
        email=org_in.email.strip() if org_in.email else None,
        phone=org_in.phone.strip() if org_in.phone else None,
        business_address=org_in.business_address.strip() if org_in.business_address else None,
        city=org_in.city.strip() if org_in.city else None,
        state=org_in.state.strip() if org_in.state else None,
        pin_code=org_in.pin_code.strip() if org_in.pin_code else None,
        gstin=org_in.gstin.strip().upper() if org_in.gstin else None,
        logo_url=org_in.logo_url.strip() if org_in.logo_url else None,
        created_by=user_id
    )
    try:
        db.add(new_org)
        await db.flush()

        # Assign owner membership
        owner_member = OrganizationMember(
            organization_id=new_org.id,
            user_id=user_id,
            role="owner"
        )
        db.add(owner_member)
        await db.commit()
        await db.refresh(new_org)

        response.status_code = status.HTTP_201_CREATED
        org_out = OrganizationRead.model_validate(new_org)
        org_out.user_role = "owner"
        return org_out
    except IntegrityError:
        await db.rollback()
        # Query existing organization with matching created_by and lower(name)
        existing_res = await db.execute(
            select(Organization).where(
                Organization.created_by == user_id,
                func.lower(Organization.name) == func.lower(normalized_name)
            )
        )
        existing_org = existing_res.scalars().first()
        if existing_org:
            m_res = await db.execute(
                select(OrganizationMember.role).where(
                    OrganizationMember.organization_id == existing_org.id,
                    OrganizationMember.user_id == user_id
                )
            )
            user_role = m_res.scalar_one_or_none() or "owner"

            response.status_code = status.HTTP_200_OK
            org_out = OrganizationRead.model_validate(existing_org)
            org_out.user_role = user_role
            return org_out
        raise


@router.get("/{organization_id}", response_model=OrganizationRead)
async def get_organization(
    organization_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gets details of a specific organization after verifying user membership.
    """
    membership = await verify_org_membership(organization_id, current_user.id, db)
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = result.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org_out = OrganizationRead.model_validate(org)
    org_out.user_role = membership.role
    return org_out


@router.patch("/{organization_id}", response_model=OrganizationRead)
async def update_organization(
    organization_id: str,
    org_in: OrganizationUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates company profile. Requires 'admin' or 'owner' role in the organization.
    """
    membership = await verify_org_admin(organization_id, current_user.id, db)
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = result.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = org_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            val = val.strip()
            if field == "gstin":
                val = val.upper()
        setattr(org, field, val)

    await db.commit()
    await db.refresh(org)

    org_out = OrganizationRead.model_validate(org)
    org_out.user_role = membership.role
    return org_out


@router.get("/{organization_id}/members", response_model=List[MemberRead])
async def list_organization_members(
    organization_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists members of an organization. Requires verified membership.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(OrganizationMember, Profile.full_name)
        .join(Profile, OrganizationMember.user_id == Profile.id)
        .where(OrganizationMember.organization_id == organization_id)
        .order_by(OrganizationMember.created_at)
    )
    result = await db.execute(query)
    rows = result.all()

    members = []
    for member, full_name in rows:
        m_dict = MemberRead(
            id=member.id,
            organization_id=member.organization_id,
            user_id=member.user_id,
            role=member.role,
            user_full_name=full_name,
            created_at=member.created_at
        )
        members.append(m_dict)
    return members
