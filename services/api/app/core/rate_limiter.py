import time
import hashlib
from collections import defaultdict
from typing import Dict, List, Tuple, Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.config import settings


class InMemoryRateLimiter:
    """
    Thread-safe, zero-dependency in-memory sliding-window rate limiter.
    Provides rate protection for pilot workloads without requiring external services or Redis.
    """
    def __init__(self):
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    def _cleanup_old_entries(self, current_time: float):
        if current_time - self._last_cleanup < 60:
            return
        cutoff = current_time - 300
        keys_to_delete = []
        for key, timestamps in self._history.items():
            self._history[key] = [t for t in timestamps if t > cutoff]
            if not self._history[key]:
                keys_to_delete.append(key)
        for k in keys_to_delete:
            del self._history[k]
        self._last_cleanup = current_time

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int, int]:
        """
        Evaluates whether a request with the given key is allowed.
        Returns:
            (is_allowed: bool, remaining_requests: int, retry_after_seconds: int)
        """
        now = time.time()
        self._cleanup_old_entries(now)
        cutoff = now - window_seconds

        timestamps = [t for t in self._history[key] if t > cutoff]
        self._history[key] = timestamps

        if len(timestamps) >= max_requests:
            oldest = timestamps[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return False, 0, retry_after

        self._history[key].append(now)
        remaining = max_requests - len(self._history[key])
        return True, remaining, 0

    def reset(self):
        """Clears all stored rate limit history (useful for test isolation)."""
        self._history.clear()


limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces sliding-window rate limits on incoming API requests:
    - 30 requests/min on heavy document export routes (/pdf, /excel)
    - 60 requests/min on authentication and profile routes (/api/auth, /api/profile)
    - 300 requests/min on general API routes
    - Bypasses health checks (/api/health*) and OpenAPI documentation
    - Bypasses if settings.ENVIRONMENT == "test" or settings.RATE_LIMIT_ENABLED is False
    """
    async def dispatch(self, request: Request, call_next):
        if not getattr(settings, "RATE_LIMIT_ENABLED", True) or settings.ENVIRONMENT == "test":
            return await call_next(request)

        path = request.url.path

        # Whitelist non-rate-limited paths
        if (
            path.startswith("/api/health")
            or path in ("/docs", "/openapi.json", "/redoc", "/")
            or request.method == "OPTIONS"
        ):
            return await call_next(request)

        # Identify client by user token or IP
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer ") and len(auth_header) > 20:
            client_id = f"user:{hashlib.sha256(auth_header.encode('utf-8')).hexdigest()[:16]}"
        else:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                client_id = f"ip:{forwarded.split(',')[0].strip()}"
            else:
                client_id = f"ip:{request.client.host if request.client else 'unknown'}"

        # Determine rate limit bucket
        if path.endswith("/pdf") or path.endswith("/excel"):
            max_requests = 30
            bucket = f"export:{client_id}"
        elif path.startswith("/api/auth") or path.startswith("/api/profile"):
            max_requests = 60
            bucket = f"auth:{client_id}"
        else:
            max_requests = 300
            bucket = f"api:{client_id}"

        allowed, remaining, retry_after = limiter.is_allowed(bucket, max_requests=max_requests, window_seconds=60)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Too many requests. Please slow down and try again later.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                }
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
