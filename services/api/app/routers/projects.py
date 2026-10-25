from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func

from app.core.database import get_db
from app.core.security import get_current_user, verify_org_membership, verify_org_admin
from app.models.models import Project, Client, Profile
from app.schemas.project import ProjectRead, ProjectCreate, ProjectUpdate, DashboardMetrics

router = APIRouter(prefix="/api/organizations/{organization_id}", tags=["Projects & Dashboard"])


@router.get("/projects", response_model=List[ProjectRead])
async def list_projects(
    organization_id: str,
    search: Optional[str] = Query(None, description="Search by project name, location, or city"),
    project_type: Optional[Literal["building", "road"]] = Query(None, description="Filter by building or road"),
    status: Optional[Literal["planning", "in_progress", "completed", "archived"]] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists projects strictly scoped to the user's organization.
    Supports Unicode search and filtering by type/status.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(Project, Client.name.label("client_name"))
        .outerjoin(Client, Project.client_id == Client.id)
        .where(Project.organization_id == organization_id)
    )

    if project_type:
        query = query.where(Project.project_type == project_type)
    if status:
        query = query.where(Project.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Project.name.ilike(term),
                Project.site_location.ilike(term),
                Project.city.ilike(term),
                Project.state.ilike(term),
                Project.description.ilike(term),
            )
        )

    query = query.order_by(Project.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    projects = []
    for proj, client_name in rows:
        p_dict = ProjectRead.model_validate(proj)
        p_dict.client_name = client_name
        projects.append(p_dict)
    return projects


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    organization_id: str,
    project_in: ProjectCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a project. Validates that the assigned client belongs to the same organization.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    # Validate client if provided
    client_name = None
    if project_in.client_id:
        client_res = await db.execute(
            select(Client).where(
                Client.id == project_in.client_id,
                Client.organization_id == organization_id
            )
        )
        client = client_res.scalars().first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned client does not exist or does not belong to this organization."
            )
        client_name = client.name

    new_project = Project(
        organization_id=organization_id,
        client_id=project_in.client_id,
        name=project_in.name.strip(),
        project_type=project_in.project_type,
        status=project_in.status,
        site_location=project_in.site_location.strip() if project_in.site_location else None,
        city=project_in.city.strip() if project_in.city else None,
        state=project_in.state.strip() if project_in.state else None,
        description=project_in.description.strip() if project_in.description else None,
        start_date=project_in.start_date,
        quotation_language=project_in.quotation_language,
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    p_dict = ProjectRead.model_validate(new_project)
    p_dict.client_name = client_name
    return p_dict


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(
    organization_id: str,
    project_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves project details with client name. Enforces organization boundary.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    query = (
        select(Project, Client.name.label("client_name"))
        .outerjoin(Client, Project.client_id == Client.id)
        .where(
            Project.id == project_id,
            Project.organization_id == organization_id
        )
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found in this organization")

    proj, client_name = row
    p_dict = ProjectRead.model_validate(proj)
    p_dict.client_name = client_name
    return p_dict


@router.patch("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    organization_id: str,
    project_id: str,
    project_in: ProjectUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates project details. Strictly validates client organization membership if client is changed.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == organization_id
        )
    )
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found in this organization")

    update_data = project_in.model_dump(exclude_unset=True)

    # If updating client_id, check tenancy
    if "client_id" in update_data and update_data["client_id"] is not None:
        client_res = await db.execute(
            select(Client).where(
                Client.id == update_data["client_id"],
                Client.organization_id == organization_id
            )
        )
        if not client_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned client does not belong to this organization."
            )

    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            val = val.strip()
        setattr(proj, field, val)

    await db.commit()
    await db.refresh(proj)

    # Fetch client name
    client_name = None
    if proj.client_id:
        c_res = await db.execute(select(Client.name).where(Client.id == proj.client_id))
        client_name = c_res.scalar()

    p_dict = ProjectRead.model_validate(proj)
    p_dict.client_name = client_name
    return p_dict


@router.post("/projects/{project_id}/archive", response_model=ProjectRead)
async def archive_project(
    organization_id: str,
    project_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Archives a project with confirmation.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == organization_id
        )
    )
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found in this organization")

    proj.status = "archived"
    await db.commit()
    await db.refresh(proj)

    p_dict = ProjectRead.model_validate(proj)
    return p_dict


@router.get("/dashboard-metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    organization_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates actual authorized dashboard metrics from database records.
    Unimplemented modules return 0 or explicit not-yet-available counts.
    """
    await verify_org_membership(organization_id, current_user.id, db)

    # Count total projects
    total_proj_res = await db.execute(
        select(func.count(Project.id)).where(Project.organization_id == organization_id)
    )
    total_projects = total_proj_res.scalar() or 0

    # Count active projects (planning + in_progress)
    active_proj_res = await db.execute(
        select(func.count(Project.id)).where(
            Project.organization_id == organization_id,
            Project.status.in_(["planning", "in_progress"])
        )
    )
    active_projects = active_proj_res.scalar() or 0

    # Count clients
    total_clients_res = await db.execute(
        select(func.count(Client.id)).where(Client.organization_id == organization_id)
    )
    total_clients = total_clients_res.scalar() or 0

    return DashboardMetrics(
        total_projects=total_projects,
        active_projects=active_projects,
        draft_estimates=0,       # Phase 1: Unbuilt modules return authentic 0
        pending_quotations=0,    # Phase 1: Unbuilt modules return authentic 0
        accepted_quotations=0,   # Phase 1: Unbuilt modules return authentic 0
        total_clients=total_clients
    )
