# Auth0 Token Vault Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add Auth0 authentication + Token Vault integration to ARCHITECT so users authenticate via Auth0 PKCE flow and their identity (JWT `sub`) namespaces all data.

**Architecture:** Frontend wraps in `Auth0Provider`; after WebSocket connects, the first message sent is `{type: "auth", token: "<jwt>"}`. Backend verifies the JWT via Auth0 JWKS, extracts `sub`, and uses it as the session identity for all Firestore/GCS writes. A Token Vault client can retrieve stored third-party OAuth tokens per user from Auth0 Management API.

**Tech Stack:** `python-jose[cryptography]` (JWT verify), `httpx` (Token Vault API, already in deps), `@auth0/auth0-react` (frontend PKCE flow), `pytest` + `unittest.mock` (backend tests).

---

### Task 1: Add Auth0 dependencies and config env vars

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`

**Step 1: Add python-jose to requirements**

Open `backend/requirements.txt` and add after `httpx>=0.27.0`:
```
python-jose[cryptography]>=3.3.0
pytest>=8.0.0
pytest-mock>=3.14.0
```

**Step 2: Add Auth0 config vars to config.py**

In `backend/app/config.py`, after the `# Server` block, add:
```python
# Auth0
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")
AUTH0_MGMT_TOKEN = os.getenv("AUTH0_MGMT_TOKEN", "")
AUTH0_ENABLED = os.getenv("AUTH0_ENABLED", "true").lower() == "true"
```

**Step 3: Update .env.example**

Add to `backend/.env.example`:
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://architect.api
AUTH0_MGMT_TOKEN=your-management-api-token
AUTH0_ENABLED=true
```

**Step 4: Install python-jose in venv**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
.venv/bin/pip install "python-jose[cryptography]" pytest pytest-mock
```
Expected: Successfully installed

**Step 5: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add backend/requirements.txt backend/app/config.py backend/.env.example
git commit -m "feat: add Auth0 config env vars and python-jose dependency"
```

---

### Task 2: Create auth0_client.py with JWT verification (TDD)

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_auth0_client.py`
- Create: `backend/app/services/auth0_client.py`

**Step 1: Create tests directory**

Create `backend/tests/__init__.py` (empty file).

**Step 2: Write failing tests**

Create `backend/tests/test_auth0_client.py`:
```python
import pytest
from unittest.mock import patch, MagicMock
from jose.exceptions import JWTError


# Patch config before importing to avoid missing env vars
@pytest.fixture(autouse=True)
def mock_config(monkeypatch):
    monkeypatch.setenv("AUTH0_DOMAIN", "test.auth0.com")
    monkeypatch.setenv("AUTH0_AUDIENCE", "https://test.api")
    monkeypatch.setenv("AUTH0_MGMT_TOKEN", "test-mgmt-token")


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

        mock_get.return_value = MagicMock(json=lambda: mock_jwks)
        mock_header.return_value = {"kid": "test-kid"}
        mock_decode.return_value = mock_claims

        result = verify_jwt("fake.jwt.token")

    assert result == mock_claims
    assert result["sub"] == "auth0|abc123"


def test_verify_jwt_raises_on_unknown_kid():
    """verify_jwt should raise ValueError when kid is not in JWKS."""
    from app.services.auth0_client import verify_jwt

    mock_jwks = {
        "keys": [{"kid": "other-kid", "kty": "RSA", "use": "sig", "n": "x", "e": "AQAB"}]
    }

    with patch("app.services.auth0_client.httpx.get") as mock_get, \
         patch("app.services.auth0_client.jwt.get_unverified_header") as mock_header:

        mock_get.return_value = MagicMock(json=lambda: mock_jwks)
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

        mock_get.return_value = MagicMock(json=lambda: mock_jwks)
        mock_header.return_value = {"kid": "test-kid"}

        with pytest.raises(JWTError):
            verify_jwt("invalid.token")


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
```

**Step 3: Run tests — verify they FAIL**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
.venv/bin/pytest tests/test_auth0_client.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.auth0_client'` (file doesn't exist yet)

**Step 4: Implement auth0_client.py**

Create `backend/app/services/auth0_client.py`:
```python
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
```

**Step 5: Run tests — verify they PASS**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
.venv/bin/pytest tests/test_auth0_client.py -v
```
Expected: `5 passed`

**Step 6: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add backend/tests/__init__.py backend/tests/test_auth0_client.py backend/app/services/auth0_client.py
git commit -m "feat: add Auth0 JWT verification and Token Vault client with tests"
```

---

### Task 3: Update main.py to verify auth on WebSocket connect

**Files:**
- Modify: `backend/app/main.py`

**Step 1: Add import and auth verification to websocket_endpoint**

In `backend/app/main.py`:

1. Add import at top (after existing imports):
```python
from app.services.auth0_client import verify_jwt
from app.config import AUTH0_ENABLED
```

2. Replace the `websocket_endpoint` function body:
```python
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Auth0 verification: expect first message to be {type: "auth", token: "..."}
    if AUTH0_ENABLED:
        try:
            raw = await asyncio.wait_for(websocket.receive(), timeout=10.0)
        except asyncio.TimeoutError:
            await websocket.close(code=4001, reason="Auth timeout")
            return

        if "text" not in raw:
            await websocket.close(code=4001, reason="Auth required")
            return

        msg = json.loads(raw["text"])
        if msg.get("type") != "auth" or not msg.get("token"):
            await websocket.close(code=4001, reason="Auth required")
            return

        try:
            claims = verify_jwt(msg["token"])
            user_id = claims["sub"]
        except Exception as e:
            logger.warning(f"Auth failed: {e}")
            await websocket.close(code=4003, reason="Unauthorized")
            return
    else:
        user_id = session_id

    session = ArchitectSession(user_id, websocket)

    try:
        await session.setup()
        await session._send_json({
            "type": "connected",
            "session_id": user_id,
            "message": "ARCHITECT is ready. Show me a room!",
        })

        while True:
            data = await websocket.receive()
            if "text" in data:
                await session.handle_message(data["text"])
            elif "bytes" in data:
                await session.handle_message(data["bytes"])
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await session.cleanup()
```

**Step 2: Verify the server imports cleanly**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
.venv/bin/python -c "from app.main import app; print('OK')"
```
Expected: `OK`

**Step 3: Run tests again to confirm nothing broke**
```bash
.venv/bin/pytest tests/ -v
```
Expected: `5 passed`

**Step 4: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add backend/app/main.py
git commit -m "feat: verify Auth0 JWT on WebSocket connect, use sub as user identity"
```

---

### Task 4: Frontend - install Auth0 and wrap app with Auth0Provider

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/main.tsx`

**Step 1: Install @auth0/auth0-react**

```bash
cd /home/antiraedus/Projects/hackathons/architect/frontend
npm install @auth0/auth0-react
```
Expected: `added X packages`

**Step 2: Update main.tsx to wrap with Auth0Provider**

Replace contents of `frontend/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
```

**Step 3: Create frontend .env.example**

Create `frontend/.env.example`:
```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://architect.api
VITE_BACKEND_URL=http://localhost:8080
```

**Step 4: Verify TypeScript compiles**
```bash
cd /home/antiraedus/Projects/hackathons/architect/frontend
npx tsc --noEmit
```
Expected: No errors

**Step 5: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add frontend/package.json frontend/package-lock.json frontend/src/main.tsx frontend/.env.example
git commit -m "feat: wrap frontend with Auth0Provider"
```

---

### Task 5: Frontend - login gate in App.tsx and pass token to WebSocket

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/hooks/useWebSocket.ts`

**Step 1: Update useWebSocket.ts to accept token and send auth message**

In `frontend/src/hooks/useWebSocket.ts`, change the `connect` signature and `ws.onopen`:

```ts
// Change the function signature:
const connect = useCallback((authToken?: string) => {
  if (wsRef.current?.readyState === WebSocket.OPEN) return;
  setStatus('connecting');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
  const host = backendUrl.replace(/^https?:\/\//, '');
  const url = `${protocol}://${host}/ws/${sessionId}`;

  const ws = new WebSocket(url);
  wsRef.current = ws;

  ws.onopen = () => {
    if (authToken) {
      ws.send(JSON.stringify({ type: 'auth', token: authToken }));
    }
    setStatus('connected');
  };

  // ... rest unchanged
}, [sessionId, onEvent, onAudio]);
```

Also update the return type: `return { status, connect, disconnect, sendBinary, sendJSON };` — no change needed, TypeScript will infer the new signature.

**Step 2: Update App.tsx with login gate and token passing**

In `frontend/src/App.tsx`:

1. Add import at top:
```tsx
import { useAuth0 } from '@auth0/auth0-react';
```

2. Inside the `App` function, add after existing state declarations:
```tsx
const { isAuthenticated, loginWithRedirect, getAccessTokenSilently, isLoading } = useAuth0();
```

3. Replace `handleStartSession`:
```tsx
const handleStartSession = async () => {
  if (!isAuthenticated) {
    loginWithRedirect();
    return;
  }
  if (!audioInitRef.current) {
    await initAudio();
    audioInitRef.current = true;
  }
  try {
    const token = await getAccessTokenSilently();
    connect(token);
  } catch {
    connect();
  }
  setIsSessionActive(true);
  setIsMicOn(true);
  setIsCameraOn(true);
};
```

4. Add loading guard before the return statement:
```tsx
if (isLoading) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
      <p className="text-gray-400">Loading...</p>
    </div>
  );
}
```

5. Update the Start Session button label to show login state:
```tsx
<button onClick={handleStartSession} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
  {isAuthenticated ? 'Start Session' : 'Log In'}
</button>
```

**Step 3: Verify TypeScript compiles**
```bash
cd /home/antiraedus/Projects/hackathons/architect/frontend
npx tsc --noEmit
```
Expected: No errors

**Step 4: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add frontend/src/App.tsx frontend/src/hooks/useWebSocket.ts
git commit -m "feat: add Auth0 login gate and pass JWT to WebSocket on connect"
```

---

### Task 6: Create CLAUDE.md project summary

**Files:**
- Create: `CLAUDE.md` (in `/home/antiraedus/Projects/hackathons/architect/`)

**Step 1: Write CLAUDE.md**

```markdown
# ARCHITECT

Real-time AI interior design assistant. Point your camera at a room, talk to the agent, and it generates photorealistic redesigns, suggests matching furniture, and builds a shopping list.

## What it does

- Gemini Live API for real-time voice + video streaming
- Computer vision to analyze room layout and style
- Imagen 3 to generate photorealistic redesign images
- Furniture search and shopping list generation
- Auth0 PKCE login — sessions namespaced by Auth0 user `sub`

## Stack

- **Backend:** FastAPI + Google ADK (`LlmAgent` + `FunctionTool`) + Gemini Live
- **Frontend:** React + Vite + Tailwind + `@auth0/auth0-react`
- **Storage:** Firestore (session data), Cloud Storage (generated images)
- **Auth:** Auth0 for AI Agents (JWT verification + Token Vault)

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in: GOOGLE_API_KEY, GOOGLE_CLOUD_PROJECT, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE, AUTH0_MGMT_TOKEN

uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Fill in: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE

npm run dev
# Opens at http://localhost:5173
```

### Tests

```bash
cd backend
.venv/bin/pytest tests/ -v
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `GCS_BUCKET_NAME` | Cloud Storage bucket for images (default: `architect-images`) |
| `FIRESTORE_COLLECTION` | Firestore collection name (default: `architect_sessions`) |
| `AUTH0_DOMAIN` | Auth0 tenant domain (e.g. `tenant.auth0.com`) |
| `AUTH0_AUDIENCE` | Auth0 API audience (e.g. `https://architect.api`) |
| `AUTH0_MGMT_TOKEN` | Auth0 Management API token for Token Vault calls |
| `AUTH0_ENABLED` | Set to `false` to skip auth during local dev (default: `true`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience |
| `VITE_BACKEND_URL` | Backend URL (default: same origin) |

## Architecture

```
Browser (React)
  └─ Auth0Provider (PKCE login)
  └─ WebSocket → /ws/{session_id}
       └─ First message: {type: "auth", token: "<jwt>"}
       └─ Backend verifies JWT via Auth0 JWKS
       └─ Uses JWT sub as user identity
       └─ ArchitectSession (ADK Runner + Gemini Live)
            └─ analyze_room() → Firestore
            └─ generate_redesign() → Imagen 3 → GCS
            └─ search_furniture() → Shopping results
            └─ build_complete_shopping_list()
            └─ generate_color_palette()
```

## Auth0 Token Vault

Token Vault stores third-party OAuth tokens (e.g. Google) per Auth0 user. The backend's `auth0_client.get_vault_token(user_sub, connection)` retrieves them via the Auth0 Management API. This enables per-user credential delegation to external services without storing tokens ourselves.

The hackathon requirement (Auth0 "Authorized to Act") is satisfied by:
1. JWT verification on every WebSocket session
2. User `sub` as the identity for all data writes (Firestore + GCS)
3. Token Vault client ready for per-user third-party OAuth token retrieval

## Key Files

```
backend/app/main.py              # FastAPI + WebSocket endpoint + auth gate
backend/app/agents/root_agent.py # ADK LlmAgent with 5 FunctionTools
backend/app/services/auth0_client.py  # JWT verify + Token Vault API
backend/app/services/firestore.py     # Firestore reads/writes
backend/app/services/cloud_storage.py # GCS image uploads
backend/app/tools/spatial.py     # analyze_room() tool
backend/app/tools/design.py      # generate_redesign(), generate_color_palette()
backend/app/tools/shopping.py    # search_furniture(), build_complete_shopping_list()
frontend/src/App.tsx             # Main UI + Auth0 login gate
frontend/src/hooks/useWebSocket.ts  # WS connection + auth token send
```
```

**Step 2: Commit**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project summary, run instructions, and Auth0 context"
```

---

### Task 7: Final verification and cleanup

**Step 1: Run all backend tests**
```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
.venv/bin/pytest tests/ -v
```
Expected: All pass

**Step 2: Verify frontend TypeScript**
```bash
cd /home/antiraedus/Projects/hackathons/architect/frontend
npx tsc --noEmit
```
Expected: No errors

**Step 3: Confirm git log looks clean**
```bash
cd /home/antiraedus/Projects/hackathons/architect
git log --oneline -8
```

**Step 4: Verify no .env files committed**
```bash
git status
```
Expected: Clean working tree, no `.env` files staged/committed
