# ARCHITECT — Live Spatial Intelligence Agent

**Design Document** | March 5, 2026
**Category**: Live Agents
**Hackathon**: Gemini Live Agent Challenge 2026
**Tagline**: "Reimagine any space, in real-time"

---

## 1. Concept

Conversational interior design agent. Users walk through a room with their camera while talking to the agent. It understands the 3D space, redesigns it based on conversation, generates photorealistic visualizations, and finds matching furniture with prices.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + Vite)                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Camera    │  │ Mic/     │  │ Chat       │  │ Gallery/     │  │
│  │ Feed      │  │ Speaker  │  │ Panel      │  │ Results      │  │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └──────────────┘  │
│       └──────────────┴──────────────┘                             │
│                      │ WebSocket (binary PCM + JSON frames)      │
└──────────────────────┼───────────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────────┐
│              CLOUD RUN (FastAPI Backend)                          │
│                      │                                           │
│  ┌───────────────────▼──────────────────────┐                    │
│  │         ROOT AGENT (ADK)                  │                    │
│  │   Gemini 2.0 Flash — Live API            │                    │
│  │   Voice + Vision + Orchestration         │                    │
│  └──┬──────────┬──────────┬─────────────────┘                    │
│     │          │          │                                       │
│  ┌──▼───┐  ┌──▼─────┐  ┌▼──────────┐                           │
│  │Spatial│  │Design  │  │Shopping   │                           │
│  │Agent  │  │Agent   │  │Agent      │                           │
│  └──┬────┘  └──┬─────┘  └──┬────────┘                           │
│     │          │            │                                    │
│  analyze    generate     search                                  │
│  room       redesign     furniture                               │
│  layout     images       + prices                                │
└─────┼──────────┼────────────┼────────────────────────────────────┘
      │          │            │
┌─────▼──────────▼────────────▼────────────────────────────────────┐
│                    GOOGLE CLOUD SERVICES                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Vertex   │  │ Imagen 3 │  │ Cloud    │  │ Firestore        │ │
│  │ AI       │  │ (image   │  │ Storage  │  │ (sessions +      │ │
│  │ (Gemini) │  │  gen)    │  │ (images) │  │  room data)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key Decisions
- **Gemini 2.0 Flash** for root agent (fast enough for real-time, supports Live API)
- **ADK** for agent orchestration — root agent delegates to specialized sub-agents
- **WebSocket** for real-time bidirectional streaming (proven pattern from MUSE)
- **Firestore** for persistent session/room data
- **Cloud Storage** for generated redesign images

## 3. Agent Design (ADK)

### Root Agent — "Architect"
- **Model**: Gemini 2.0 Flash (Live API)
- **Inputs**: Camera frames (JPEG @1fps), audio (PCM 16kHz), text
- **Role**: Conversational orchestrator. Understands user intent, delegates to sub-agents, presents results via voice.
- **Tools**: `delegate_to_spatial`, `delegate_to_design`, `delegate_to_shopping`

### Sub-Agent 1 — "SpatialAnalyzer"
- **Model**: Gemini 2.0 Flash (vision)
- **Input**: Camera frames from root agent
- **Output**: Structured JSON — room dimensions (estimated), furniture inventory, style classification, lighting assessment
- **Key tool**: `analyze_frame(image_bytes)` → `RoomAnalysis` object
- **Stored in**: Firestore document per session

### Sub-Agent 2 — "DesignGenerator"
- **Model**: Gemini 2.0 Flash + Imagen 3
- **Input**: `RoomAnalysis` + user style preferences
- **Output**: Generated redesign images, color palettes, mood descriptions
- **Key tools**:
  - `generate_redesign(room_analysis, style_prompt)` → image URLs (via Imagen 3)
  - `generate_palette(style)` → color hex codes + names
  - `generate_mood_board(style, room_type)` → composite image

### Sub-Agent 3 — "ShoppingAgent"
- **Model**: Gemini 2.0 Flash
- **Input**: Design preferences + furniture items to find
- **Output**: Product recommendations with prices and links
- **Key tools**:
  - `search_products(query, style, budget)` → product list (Google Shopping API / SerpAPI)
  - `compare_prices(product_name)` → price comparison
  - `build_shopping_list(items)` → formatted list with totals

## 4. Data Flow

```
User walks through room with camera
    → Root Agent receives frames + voice
    → Root delegates to SpatialAnalyzer
    → SpatialAnalyzer returns RoomAnalysis JSON
    → User says "make it mid-century modern"
    → Root delegates to DesignGenerator with (RoomAnalysis + "mid-century modern")
    → DesignGenerator returns redesign images + palette
    → Root presents images to user, asks for feedback
    → User approves → Root delegates to ShoppingAgent
    → ShoppingAgent returns matching furniture + prices
    → Root presents final package: before/after + shopping list + total cost
```

## 5. Frontend

### Tech Stack
- React 19 + Vite
- TailwindCSS
- WebSocket (binary PCM + JSON, same as MUSE)

### Views
1. **Scan View** — Live camera feed with overlay showing detected room features. Voice conversation active.
2. **Design View** — Side-by-side original vs. generated redesign. Style controls. Palette display.
3. **Shop View** — Product cards with images, prices, links. Running total.
4. **Summary View** — Before/after comparison, mood board, complete shopping list with total cost.

## 6. Demo Script (4 minutes)

| Time | Scene | What Happens |
|------|-------|-------------|
| 0:00-0:30 | Pitch | "What if your phone could redesign your room in real-time?" |
| 0:30-1:30 | Scan | Walk through living room, agent narrates what it sees |
| 1:30-2:30 | Design | "Make it mid-century modern" → redesign images, before/after, palette |
| 2:30-3:30 | Shop | Agent finds matching furniture, shows prices, builds shopping list |
| 3:30-4:00 | Summary | Before/after + total cost + "shall I save this?" |

## 7. Error Handling

- Camera permission denied → graceful fallback to photo upload
- Imagen 3 rate limits → queue with progress indicator
- Shopping API failures → cached/mock results as backup
- WebSocket disconnect → auto-reconnect with session resume (Firestore)

## 8. GCP Services Used

| Service | Purpose |
|---------|---------|
| Cloud Run | Backend hosting (FastAPI) |
| Vertex AI | Gemini 2.0 Flash (Live API + vision) |
| Imagen 3 | Redesign image generation |
| Firestore | Session state, room analysis data |
| Cloud Storage | Generated images |
| Secret Manager | API keys |

## 9. Submission Checklist

- [ ] Text description on Devpost
- [ ] Public GitHub repo with README + spin-up instructions
- [ ] Proof of GCP deployment (screen recording of Cloud Run console)
- [ ] Architecture diagram (this document's diagram, exported as SVG)
- [ ] Demo video (< 4 minutes)
- [ ] Blog post (bonus)
- [ ] Automated cloud deployment scripts (bonus)
- [ ] GDG profile link (bonus — already done: https://gdg.community.dev/u/mv8vhm/)

## 10. Differentiation from MUSE

| | MUSE | ARCHITECT |
|---|------|-----------|
| Category | Creative Storyteller | Live Agents |
| Core | Synesthesia — cross-sense art generation | Spatial intelligence — room redesign |
| Input | Audio + camera → abstract art | Camera + voice → actionable design |
| Output | Art, poetry, music visualizations | Redesign images, shopping lists, costs |
| ADK usage | Single agent + tools | Multi-agent orchestration |
| Practical value | Artistic/experimental | Direct consumer utility |
