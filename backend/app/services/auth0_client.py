import httpx
from jose import jwt
import logging
import os

logger = logging.getLogger(__name__)


def verify_jwt(token: str) -> dict:
    """Verify Auth0 JWT via JWKS and return decoded claims.

    Raises ValueError if key not found, JWTError if token invalid.
    """
    domain = os.getenv("AUTH0_DOMAIN", "")
    audience = os.getenv("AUTH0_AUDIENCE", "")

    jwks_response = httpx.get(f"https://{domain}/.well-known/jwks.json")
    jwks = jwks_response.json()

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
        logger.warning(f"Token Vault request failed: {e}")

    return None
