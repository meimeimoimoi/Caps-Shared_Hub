import secrets

from fastapi import Header, HTTPException, status

from app.config import settings


_DEV_ENVIRONMENTS = {"dev", "development", "local", "test"}


def is_internal_key_required() -> bool:
    """Require INTERNAL_API_KEY whenever REQUIRE_INTERNAL_API_KEY is set or APP_ENV is non-dev."""
    if settings.REQUIRE_INTERNAL_API_KEY:
        return True
    return settings.APP_ENV.strip().lower() not in _DEV_ENVIRONMENTS


def verify_internal_key(
    x_internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
) -> None:
    """Validate X-Internal-Key header; fail closed outside dev or when REQUIRE_INTERNAL_API_KEY is enabled."""
    expected = settings.INTERNAL_API_KEY.strip()
    if not expected:
        if is_internal_key_required():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="INTERNAL_API_KEY is required in this environment.",
            )
        return

    if not x_internal_key or not secrets.compare_digest(x_internal_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key.",
        )
