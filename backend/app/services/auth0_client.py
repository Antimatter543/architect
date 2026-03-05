import httpx
import logging
import os
import time
from jose import jwt

logger = logging.getLogger(__name__)

_jwks_cache: dict = {}
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS = 3600


def _fetch_jwks(domain: str) -> dict:
    global _jwks_cache, _jwks_cache_time
    if _jwks_cache and (time.monotonic() - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    response = httpx.get(f"https://{domain}/.well-known/jwks.json", timeout=5.0)
    response.raise_for_status()
    _jwks_cache = response.json()
    _jwks_cache_time = time.monotonic()
    return _jwks_cache


def verify_jwt(token: str) -> dict:
    """Verify Auth0 JWT via JWKS and return decoded claims.

    Raises ValueError if domain unconfigured or key not found.
    Raises JWTError if token is invalid.
    """
    domain = os.getenv("AUTH0_DOMAIN", "")
    audience = os.getenv("AUTH0_AUDIENCE", "")

    if not domain:
        raise ValueError("AUTH0_DOMAIN is not configured")
    if not audience:
        raise ValueError("AUTH0_AUDIENCE is not configured")

    jwks = _fetch_jwks(domain)
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    rsa_key = None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
            break

    if rsa_key is None:
        raise ValueError("Unable to find appropriate key")

    return jwt.decode(
        token,
        rsa_key,
        algorithms=["RS256"],
        audience=audience,
        issuer=f"https://{domain}/",
    )


def get_vault_token(user_sub: str, connection: str) -> str | None:
    """Retrieve a stored OAuth token from Auth0 Token Vault.

    Args:
        user_sub: The Auth0 user ID (sub claim), e.g. "auth0|abc123".
        connection: The federated connection name, e.g. "google-oauth2".

    Returns:
        The access token string, or None if not found / error.
    """
    domain = os.getenv("AUTH0_DOMAIN", "")
    mgmt_token = os.getenv("AUTH0_MGMT_TOKEN", "")

    url = (
        f"https://{domain}/api/v2/users/{user_sub}"
        f"/federated-connections/{connection}/access_token"
    )

    try:
        resp = httpx.get(
            url,
            headers={"Authorization": f"Bearer {mgmt_token}"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
    except Exception as e:
        logger.warning("Token Vault request failed: %s: %s", type(e).__name__, e)

    return None
