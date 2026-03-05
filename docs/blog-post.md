# How I Added Auth0 Token Vault to a Real-Time AI Interior Design App

*Built for the Auth0 "Authorized to Act" Hackathon*

---

When I first built ARCHITECT — a real-time AI interior design assistant powered by Gemini Live — authentication was an afterthought. Sessions were random strings, data had no real owner, and there was nothing stopping anyone from accessing anyone else's room analyses or generated designs.

Adding Auth0 Token Vault changed all of that, and it was cleaner than I expected.

## What ARCHITECT Does

ARCHITECT lets you point your phone camera at any room, talk to an AI agent, and get back photorealistic redesigns with a matching furniture shopping list — all in real time.

The stack:
- **Backend:** FastAPI + Google ADK with Gemini Live API for real-time voice and vision
- **Frontend:** React + Vite with an AudioWorklet pipeline for 16kHz → 48kHz PCM streaming
- **Storage:** Firestore for session data, Cloud Storage for generated images
- **Agent tools:** `analyze_room()`, `generate_redesign()`, `search_furniture()`, `generate_color_palette()`

The interesting architectural detail: everything runs over a single persistent WebSocket. Audio chunks, camera frames, tool results, and design images all flow through one binary-framed connection with a JSON header + null byte + payload protocol.

## The Problem: Zero Identity

Before Auth0, the session identity was `arch-${Date.now()}-${Math.random()}`. Every Firestore document and GCS image was namespaced by this random string. Refresh the page — new random string, lost history. Two browser tabs — separate identities, separate data.

This isn't just bad UX. It means there's no way to build anything meaningful on top of user history: saved designs, preference learning, or delegated access to their Google Drive to save mood boards.

## The Solution: Auth0 JWT + Token Vault

The integration has three layers:

### 1. Frontend: PKCE Login Gate

`@auth0/auth0-react` wraps the whole app. Before opening the WebSocket, we get an access token:

```tsx
const handleStartSession = async () => {
  if (!isAuthenticated) {
    loginWithRedirect();
    return;
  }
  const token = await getAccessTokenSilently();
  connect(token);
};
```

The token goes out as the very first WebSocket message — before any audio or camera data:

```ts
ws.onopen = () => {
  if (authToken) {
    ws.send(JSON.stringify({ type: 'auth', token: authToken }));
  }
  // Status only becomes 'connected' after server confirms
};
```

### 2. Backend: JWT Verification on Every Session

The FastAPI WebSocket endpoint verifies the token before creating an `ArchitectSession`. Auth0's JWKS endpoint validates the signature; the `sub` claim becomes the user identity:

```python
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    if AUTH0_ENABLED:
        raw = await asyncio.wait_for(websocket.receive(), timeout=10.0)
        msg = json.loads(raw["text"])
        claims = verify_jwt(msg["token"])
        user_id = claims["sub"]  # "auth0|abc123"
    else:
        user_id = session_id  # local dev fallback

    session = ArchitectSession(user_id, websocket)
```

The JWT verification itself uses `python-jose` with a JWKS cache (1-hour TTL) to avoid hitting Auth0 on every connection:

```python
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
```

### 3. Token Vault: Per-User Third-Party Credentials

This is where Token Vault changes the game. Right now ARCHITECT uses ambient GCP credentials for Cloud Storage. But what if users wanted to save designs to their own Google Drive, or pull inspiration from their Pinterest boards?

Token Vault stores per-user OAuth tokens for third-party services. The retrieval is a single API call:

```python
def get_vault_token(user_sub: str, connection: str) -> str | None:
    """Retrieve a stored OAuth token from Auth0 Token Vault."""
    url = (
        f"https://{domain}/api/v2/users/{user_sub}"
        f"/federated-connections/{connection}/access_token"
    )
    resp = httpx.get(url, headers={"Authorization": f"Bearer {mgmt_token}"}, timeout=10.0)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None
```

Instead of building your own token storage, refresh logic, and encryption — Auth0 handles all of it. Your tool just asks: *"What's this user's Google OAuth token?"* and gets an answer.

## What Changed in the Architecture

**Before:** `session_id = random string → Firestore key`

**After:** `JWT sub claim → verified user identity → Firestore key`

Every room analysis, generated design, and shopping list is now genuinely owned by a real user. Refresh the page: same user, same data. Open a second tab: same session. Sign in on a different device: full history.

The WebSocket protocol change was minimal — one extra message at the start. The Firestore/GCS code didn't change at all: it already namespaced by `session_id`, which is now just a real user ID instead of a random one.

## Developer Experience Notes

A few things that made this smoother than expected:

**`AUTH0_ENABLED=false` for local dev.** The backend has a bypass flag so you can run the full stack locally without setting up an Auth0 tenant:

```bash
AUTH0_ENABLED=false uvicorn app.main:app --reload --port 8080
```

**JWKS caching matters.** Without caching, every WebSocket connection makes an outbound HTTP call to Auth0. With a 1-hour TTL cache, production deployments make roughly one call per hour regardless of traffic.

**The close code convention.** Auth0 rejection → `4003 Unauthorized`. Malformed auth message → `4001 Auth Required`. The frontend maps `ev.code >= 4000` to an `error` state so users see a clear message rather than a silent disconnect.

**Token persistence across refreshes.** `cacheLocation="localstorage"` on `Auth0Provider` means users don't re-authenticate on every page load. The default in-memory cache is more secure (no XSS exposure) but terrible UX for a demo.

## The Result

ARCHITECT went from "anonymous art project" to "personalized AI design studio" with about 200 lines of changes across 4 files. The agent tools didn't change at all. The Firestore schema didn't change. The only thing that changed was *what* the session ID means.

That's the right abstraction. Auth handles identity; your app handles the interesting stuff.

---

**Links:**
- GitHub: [github.com/Antimatter543/architect](https://github.com/Antimatter543/architect)
- Built with: Google Gemini Live, Google ADK, Auth0, FastAPI, React

*Part of the Auth0 "Authorized to Act" Hackathon — building AI agents that act on behalf of real, authenticated users.*
