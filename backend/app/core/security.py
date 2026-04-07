from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import secrets

import bcrypt
from jose import JWTError, jwt
from cryptography.fernet import Fernet

from app.core.config import get_settings

settings = get_settings()

# ── Password hashing ──


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ── JWT tokens ──


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a signed JWT refresh token with longer expiry."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token.

    Returns:
        The token payload dict, or None if the token is invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


# ── Pro Widget Security ──


def generate_workspace_keys() -> tuple[str, str]:
    """
    Generates a public/secret key pair for a workspace.
    Public: ws_live_...
    Secret: sk_live_...
    """
    public_key = f"ws_live_{secrets.token_urlsafe(24)}"
    secret_key = f"sk_live_{secrets.token_urlsafe(32)}"
    return public_key, secret_key


def encrypt_secret_key(plain_key: str) -> str:
    """Encrypt a secret key using Fernet."""
    if settings.ENCRYPTION_KEY == "change-me-to-a-valid-fernet-key-32-bytes-b64":
        return plain_key # Fallback for dev if not configured
    f = Fernet(settings.ENCRYPTION_KEY.encode())
    return f.encrypt(plain_key.encode()).decode()


def decrypt_secret_key(encrypted_key: str) -> str:
    """Decrypt a secret key using Fernet."""
    if settings.ENCRYPTION_KEY == "change-me-to-a-valid-fernet-key-32-bytes-b64" or not encrypted_key:
        return encrypted_key
    try:
        f = Fernet(settings.ENCRYPTION_KEY.encode())
        return f.decrypt(encrypted_key.encode()).decode()
    except Exception:
        # If decryption fails (e.g. it was stored plain before), return as is if it looks like a key
        if encrypted_key.startswith("sk_live_"):
            return encrypted_key
        raise


def create_widget_token(conversation_id: str, secret_key: str, expires_in_minutes: int = 20) -> str:
    """
    Creates a JWT token for the widget WebSocket, signed with the workspace's secret_key.
    Since it's signed by the WORKSPACE'S key, it's effectively multi-tenant isolated.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    payload = {
        "sub": conversation_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    # We use HS256 with the decrypted workspace secret_key as the secret
    return jwt.encode(payload, secret_key, algorithm="HS256")


def verify_widget_token(token: str, secret_key: str, previous_secret_key: Optional[str] = None) -> Optional[dict]:
    """
    Verifies a widget JWT token against the current secret key, 
    and optionally fallbacks to a previous key (grace period).
    """
    try:
        # Try current key
        return jwt.decode(token, secret_key, algorithms=["HS256"])
    except JWTError:
        # Try previous key if provided
        if previous_secret_key:
            try:
                return jwt.decode(token, previous_secret_key, algorithms=["HS256"])
            except JWTError:
                pass
        return None


def create_dashboard_ws_token(user_id: str, workspace_id: str, expires_in_minutes: int = 60) -> str:
    """
    Creates a JWT token for the Agent Dashboard WebSocket.
    Signed with the system's SECRET_KEY since it's an internal-ish connection.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    payload = {
        "sub": user_id,
        "wid": workspace_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "dashboard_ws"
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_dashboard_ws_token(token: str) -> Optional[dict]:
    """
    Verifies a dashboard JWT token against the system's SECRET_KEY.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "dashboard_ws":
            return None
        return payload
    except JWTError:
        return None
