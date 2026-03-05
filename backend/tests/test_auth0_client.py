import pytest
from unittest.mock import patch, MagicMock, call
from jose.exceptions import JWTError
import app.services.auth0_client as auth0_module


@pytest.fixture(autouse=True)
def set_auth0_env(monkeypatch):
    monkeypatch.setenv("AUTH0_DOMAIN", "test.auth0.com")
    monkeypatch.setenv("AUTH0_AUDIENCE", "https://test.api")
    monkeypatch.setenv("AUTH0_MGMT_TOKEN", "test-mgmt-token")


@pytest.fixture(autouse=True)
def clear_jwks_cache():
    """Reset module-level JWKS cache before each test."""
    auth0_module._jwks_cache = {}
    auth0_module._jwks_cache_time = 0.0
    yield
    auth0_module._jwks_cache = {}
    auth0_module._jwks_cache_time = 0.0


def test_verify_jwt_returns_claims_on_valid_token():
    """verify_jwt should return decoded claims for a valid token."""
    from app.services.auth0_client import verify_jwt

    mock_jwks = {
        "keys": [{
            "kty": "RSA", "kid": "test-kid", "use": "sig",
            "n": "test-n", "e": "AQAB",
        }]
    }
    mock_claims = {"sub": "auth0|abc123", "aud": "https://test.api"}

    with patch("app.services.auth0_client.httpx.get") as mock_get, \
         patch("app.services.auth0_client.jwt.get_unverified_header") as mock_header, \
         patch("app.services.auth0_client.jwt.decode") as mock_decode:

        mock_get.return_value = MagicMock(
            json=lambda: mock_jwks,
            raise_for_status=lambda: None,
        )
        mock_header.return_value = {"kid": "test-kid"}
        mock_decode.return_value = mock_claims

        result = verify_jwt("fake.jwt.token")

    assert result == mock_claims
    assert result["sub"] == "auth0|abc123"
    mock_decode.assert_called_once_with(
        "fake.jwt.token",
        {"kty": "RSA", "kid": "test-kid", "use": "sig", "n": "test-n", "e": "AQAB"},
        algorithms=["RS256"],
        audience="https://test.api",
        issuer="https://test.auth0.com/",
    )


def test_verify_jwt_raises_on_unknown_kid():
    """verify_jwt should raise ValueError when kid is not in JWKS."""
    from app.services.auth0_client import verify_jwt

    mock_jwks = {
        "keys": [{"kid": "other-kid", "kty": "RSA", "use": "sig", "n": "x", "e": "AQAB"}]
    }

    with patch("app.services.auth0_client.httpx.get") as mock_get, \
         patch("app.services.auth0_client.jwt.get_unverified_header") as mock_header:

        mock_get.return_value = MagicMock(
            json=lambda: mock_jwks,
            raise_for_status=lambda: None,
        )
        mock_header.return_value = {"kid": "missing-kid"}

        with pytest.raises(ValueError, match="Unable to find appropriate key"):
            verify_jwt("fake.jwt.token")


def test_verify_jwt_raises_on_invalid_token():
    """verify_jwt should re-raise JWTError from jose on bad token."""
    from app.services.auth0_client import verify_jwt

    mock_jwks = {
        "keys": [{"kid": "test-kid", "kty": "RSA", "use": "sig", "n": "x", "e": "AQAB"}]
    }

    with patch("app.services.auth0_client.httpx.get") as mock_get, \
         patch("app.services.auth0_client.jwt.get_unverified_header") as mock_header, \
         patch("app.services.auth0_client.jwt.decode", side_effect=JWTError("bad token")):

        mock_get.return_value = MagicMock(
            json=lambda: mock_jwks,
            raise_for_status=lambda: None,
        )
        mock_header.return_value = {"kid": "test-kid"}

        with pytest.raises(JWTError):
            verify_jwt("invalid.token")


def test_verify_jwt_raises_on_missing_domain(monkeypatch):
    """verify_jwt should raise ValueError when AUTH0_DOMAIN is not set."""
    from app.services.auth0_client import verify_jwt

    monkeypatch.setenv("AUTH0_DOMAIN", "")

    with pytest.raises(ValueError, match="AUTH0_DOMAIN is not configured"):
        verify_jwt("any.token")


def test_get_vault_token_returns_token_on_success():
    """get_vault_token should return access_token string when API returns 200."""
    from app.services.auth0_client import get_vault_token

    with patch("app.services.auth0_client.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"access_token": "vault-token-abc"}
        )

        result = get_vault_token("auth0|user123", "google-oauth2")

    assert result == "vault-token-abc"


def test_get_vault_token_returns_none_on_failure():
    """get_vault_token should return None when API returns non-200."""
    from app.services.auth0_client import get_vault_token

    with patch("app.services.auth0_client.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=404)

        result = get_vault_token("auth0|user123", "google-oauth2")

    assert result is None
