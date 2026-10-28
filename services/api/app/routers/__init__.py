from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.organizations import router as organizations_router
from app.routers.clients import router as clients_router
from app.routers.projects import router as projects_router
from app.routers.estimates import router as estimates_router
from app.routers.quotations import router as quotations_router

from app.routers.rates import router as rates_router, global_rates_router
from app.routers.expenses import router as expenses_router
from app.routers.drawings import router as drawings_router
from app.routers.geolocation import router as geolocation_router
from app.routers.invoices import router as invoices_router

__all__ = [
    "health_router",
    "auth_router",
    "profile_router",
    "organizations_router",
    "clients_router",
    "projects_router",
    "estimates_router",
    "quotations_router",
    "rates_router",
    "global_rates_router",
    "expenses_router",
    "drawings_router",
    "geolocation_router",
    "invoices_router",
]
