# ARCHITECT — Live Spatial Intelligence

> Point your camera at a room. Tell ARCHITECT how you want it to feel. Watch it redesign the space and find the furniture — in real-time.

Built for Google ADK + Gemini hackathon. Uses Gemini Live API for voice+vision, Imagen 3 for photorealistic redesigns, and ADK multi-agent architecture for room analysis and furniture shopping.

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           React Frontend                 │
                    │  Camera → WebSocket → Audio Playback     │
                    │  Transcript | Designs | Shopping tabs    │
                    └──────────────┬──────────────────────────┘
                                   │ WebSocket (PCM audio + JPEG frames + JSON)
                    ┌──────────────▼──────────────────────────┐
                    │         FastAPI Backend (Cloud Run)      │
                    │                                          │
                    │  ┌────────────────────────────────────┐  │
                    │  │         ADK Root Agent             │  │
                    │  │   Gemini 2.0 Flash Live API        │  │
                    │  │                                    │  │
                    │  │  Tools:                            │  │
                    │  │  • analyze_room      → Firestore   │  │
                    │  │  • generate_redesign → Imagen 3    │  │
                    │  │                        → GCS       │  │
                    │  │  • generate_color_palette          │  │
                    │  │  • search_furniture  → Gemini Flash│  │
                    │  │  • build_shopping_list             │  │
                    │  └────────────────────────────────────┘  │
                    └─────────────────────────────────────────┘
                              │              │
                    ┌─────────▼──┐    ┌──────▼──────┐
                    │ Firestore  │    │  Cloud      │
                    │ (sessions) │    │  Storage    │
                    └────────────┘    │  (images)   │
                                      └─────────────┘
```

## How It Works

1. **Connect** — Click "Start Session." Camera and mic activate.
2. **Scan** — ARCHITECT sees your room through the camera and describes what it observes. It calls `analyze_room` to save the spatial data.
3. **Design** — Say a style: "Make it mid-century modern" or "Go Scandinavian." ARCHITECT calls `generate_redesign` (Imagen 3) and streams the photorealistic result to the Designs tab.
4. **Shop** — ARCHITECT calls `search_furniture` to find matching pieces with prices from real retailers. A complete shopping list appears in the Shopping tab.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM Orchestration | Google ADK + Gemini 2.0 Flash Live API |
| Image Generation | Imagen 3 (`gemini-2.0-flash-exp-image-generation`) |
| Sub-agent LLM | Gemini 2.0 Flash |
| Backend | Python 3.12, FastAPI, uvicorn |
| Frontend | React 18, Vite, TailwindCSS, TypeScript |
| Audio | AudioWorklet API (PCM 16kHz capture → 24kHz playback) |
| Storage | Google Cloud Firestore + Cloud Storage |
| Deployment | Cloud Run + Cloud Build |

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google API key with Gemini access

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: add GOOGLE_API_KEY

python -m app.main
# → http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Deploy to GCP

```bash
# One-time setup (creates buckets, Firestore, secrets)
./deploy/setup.sh

# Deploy
gcloud builds submit --config=deploy/cloudbuild.yaml .
```

## Project Structure

```
architect/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI + WebSocket session
│   │   ├── config.py        # Env vars + model names
│   │   ├── models.py        # Pydantic data models
│   │   ├── agents/
│   │   │   └── root_agent.py    # ADK LlmAgent
│   │   ├── prompts/
│   │   │   └── root_system.py   # System prompt
│   │   ├── tools/
│   │   │   ├── spatial.py       # analyze_room
│   │   │   ├── design.py        # generate_redesign, color_palette
│   │   │   └── shopping.py      # search_furniture, shopping_list
│   │   └── services/
│   │       ├── firestore.py     # Session persistence
│   │       └── cloud_storage.py # Image uploads
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useAudioCapture.ts
│   │   │   ├── useAudioPlayback.ts
│   │   │   └── useCameraCapture.ts
│   │   ├── components/
│   │   │   ├── CameraPreview.tsx
│   │   │   ├── TranscriptPanel.tsx
│   │   │   ├── DesignGallery.tsx
│   │   │   ├── ShoppingPanel.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── RoomAnalysisCard.tsx
│   │   └── types/
│   │       └── events.ts        # TypeScript event types
│   └── public/
│       ├── pcm-capture-processor.js
│       └── pcm-playback-processor.js
└── deploy/
    ├── cloudbuild.yaml
    └── setup.sh
```

## WebSocket Protocol

**Client → Server:**
- Binary: `[JSON header]\x00[PCM audio bytes]` — 16kHz PCM audio chunks
- JSON `{ type: "video_frame", data: "<base64 JPEG>" }` — camera frames at 1fps
- JSON `{ type: "text", text: "..." }` — typed messages

**Server → Client:**
- Binary: `[JSON header]\x00[PCM audio bytes]` — 24kHz PCM audio from agent
- JSON events: `connected`, `transcript`, `phase_change`, `room_analysis`, `design_generated`, `products_found`, `shopping_list`, `turn_complete`, `error`
