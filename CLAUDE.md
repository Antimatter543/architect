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
# Fill in: GOOGLE_API_KEY, GOOGLE_CLOUD_PROJECT, AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_MGMT_TOKEN

uvicorn app.main:app --reload --port 8080
```

Set `AUTH0_ENABLED=false` in `.env` to skip JWT verification during local development.

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
pip install -r requirements-dev.txt
pytest tests/ -v
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
backend/app/main.py                   # FastAPI + WebSocket endpoint + auth gate
backend/app/agents/root_agent.py      # ADK LlmAgent with 5 FunctionTools
backend/app/services/auth0_client.py  # JWT verify + Token Vault API
backend/app/services/firestore.py     # Firestore reads/writes
backend/app/services/cloud_storage.py # GCS image uploads
backend/app/tools/spatial.py          # analyze_room() tool
backend/app/tools/design.py           # generate_redesign(), generate_color_palette()
backend/app/tools/shopping.py         # search_furniture(), build_complete_shopping_list()
frontend/src/App.tsx                  # Main UI + Auth0 login gate
frontend/src/hooks/useWebSocket.ts    # WS connection + auth token send
```
