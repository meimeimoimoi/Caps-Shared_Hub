import secrets

from fastapi import Header, HTTPException, status

from app.config import settings


def verify_internal_key(
    x_internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
) -> None:
    """Validate X-Internal-Key header when INTERNAL_API_KEY is configured."""
    expected = settings.INTERNAL_API_KEY
    if not expected:
        return

    if not x_internal_key or not secrets.compare_digest(x_internal_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key.",
        )
