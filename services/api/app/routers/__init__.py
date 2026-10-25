from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.organizations import router as organizations_router
from app.routers.clients import router as clients_router
from app.routers.projects import router as projects_router

__all__ = [
    "health_router",
    "auth_router",
    "profile_router",
    "organizations_router",
    "clients_router",
    "projects_router",
]
