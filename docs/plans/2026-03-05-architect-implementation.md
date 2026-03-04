# ARCHITECT Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time interior design agent that sees rooms through camera, redesigns them with AI-generated images, and finds matching furniture — using Gemini Live API + ADK multi-agent architecture.

**Architecture:** ADK multi-agent system with Root Agent (voice+vision orchestrator), SpatialAnalyzer (room understanding), DesignGenerator (Imagen 3 redesigns), and ShoppingAgent (furniture search). FastAPI backend on Cloud Run, React frontend with WebSocket streaming. Reuse MUSE's proven WebSocket/audio/camera patterns.

**Tech Stack:** Python 3.12, FastAPI, Google ADK, Gemini 2.0 Flash (Live API), Imagen 3, Firestore, Cloud Storage, React 18, Vite, TailwindCSS, TypeScript

---

## Task 0: Project Scaffolding

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `backend/.env.example`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx` (placeholder)
- Create: `frontend/src/index.css`
- Create: `.gitignore`
- Create: `README.md` (minimal)

**Step 1: Initialize git repo**

```bash
cd /home/antiraedus/Projects/hackathons/architect
git init
```

**Step 2: Create backend scaffold**

`backend/requirements.txt`:
```
google-adk>=1.0.0
google-genai>=1.0.0
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
python-dotenv>=1.0.0
google-cloud-firestore>=2.19.0
google-cloud-storage>=2.19.0
Pillow>=10.0.0
websockets>=13.0
httpx>=0.27.0
pydantic>=2.0.0
```

`backend/.env.example`:
```
GOOGLE_API_KEY=your-api-key-here
GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=architect-images
FIRESTORE_COLLECTION=architect_sessions
CORS_ORIGINS=http://localhost:5173
```

`backend/app/__init__.py`: empty file

`backend/app/config.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

# Models
ORCHESTRATOR_MODEL = "gemini-2.0-flash-live-001"
IMAGE_GEN_MODEL = "gemini-2.0-flash-exp-image-generation"
SUBAGENT_MODEL = "gemini-2.0-flash"

# GCP
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "architect-images")
FIRESTORE_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "architect_sessions")

# Server
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

`backend/app/main.py` (minimal placeholder):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, HOST, PORT

app = FastAPI(title="ARCHITECT API")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "architect"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
```

`backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--timeout-keep-alive", "3600"]
```

**Step 3: Create frontend scaffold**

`frontend/package.json`:
```json
{
  "name": "architect-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^4.0.18",
    "@testing-library/react": "^16.3.2",
    "jsdom": "^26.0.0"
  }
}
```

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

`frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`frontend/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ARCHITECT — Live Spatial Intelligence</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`frontend/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`frontend/src/App.tsx`:
```tsx
export default function App() {
  return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
    <h1 className="text-4xl font-bold">ARCHITECT</h1>
  </div>;
}
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
__pycache__/
*.pyc
.venv/
*.egg-info/
.DS_Store
```

**Step 5: Install dependencies and verify**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

cd /home/antiraedus/Projects/hackathons/architect/frontend
npm install
```

**Step 6: Verify backend starts**

```bash
cd /home/antiraedus/Projects/hackathons/architect/backend
source .venv/bin/activate && python -m app.main &
curl http://localhost:8080/health
# Expected: {"status":"ok","service":"architect"}
kill %1
```

**Step 7: Verify frontend starts**

```bash
cd /home/antiraedus/Projects/hackathons/architect/frontend
npm run dev &
# Expected: Vite server at http://localhost:5173
kill %1
```

**Step 8: Commit**

```bash
cd /home/antiraedus/Projects/hackathons/architect
git add -A && git commit -m "feat: initial project scaffold — FastAPI backend + React frontend"
```

---

## Task 1: Pydantic Models & Type Definitions

**Files:**
- Create: `backend/app/models.py`
- Create: `frontend/src/types/events.ts`

**Step 1: Create backend models**

`backend/app/models.py`:
```python
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AgentPhase(str, Enum):
    SCANNING = "scanning"
    DESIGNING = "designing"
    SHOPPING = "shopping"
    SUMMARY = "summary"


class FurnitureItem(BaseModel):
    name: str
    style: str
    estimated_dimensions: Optional[str] = None
    condition: Optional[str] = None


class RoomAnalysis(BaseModel):
    room_type: str  # e.g., "living room", "bedroom"
    estimated_dimensions: Optional[str] = None
    current_style: str  # e.g., "modern", "traditional"
    lighting: str  # e.g., "natural, bright", "dim, artificial"
    furniture: list[FurnitureItem] = []
    color_palette: list[str] = []  # hex codes of dominant colors
    notes: str = ""


class DesignConcept(BaseModel):
    style: str
    description: str
    image_url: Optional[str] = None
    image_b64: Optional[str] = None
    color_palette: list[str] = []
    mood: str = ""


class ProductResult(BaseModel):
    name: str
    price: float
    currency: str = "USD"
    url: Optional[str] = None
    image_url: Optional[str] = None
    source: str = ""
    style_match: float = 0.0  # 0-1 how well it matches


class ShoppingList(BaseModel):
    items: list[ProductResult] = []
    total: float = 0.0
    currency: str = "USD"
```

**Step 2: Create frontend types**

`frontend/src/types/events.ts`:
```typescript
export type AgentPhase = 'scanning' | 'designing' | 'shopping' | 'summary';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Events FROM backend
export type ArchitectEvent =
  | { type: 'connected'; session_id: string; message: string }
  | { type: 'transcript'; text: string; role: 'user' | 'assistant' }
  | { type: 'phase_change'; phase: AgentPhase }
  | { type: 'room_analysis'; analysis: RoomAnalysis }
  | { type: 'design_generated'; design: DesignConcept }
  | { type: 'products_found'; products: ProductResult[] }
  | { type: 'shopping_list'; list: ShoppingList }
  | { type: 'generating_image' }
  | { type: 'turn_complete' }
  | { type: 'error'; message: string };

export interface RoomAnalysis {
  room_type: string;
  estimated_dimensions?: string;
  current_style: string;
  lighting: string;
  furniture: FurnitureItem[];
  color_palette: string[];
  notes: string;
}

export interface FurnitureItem {
  name: string;
  style: string;
  estimated_dimensions?: string;
  condition?: string;
}

export interface DesignConcept {
  style: string;
  description: string;
  image_url?: string;
  image_b64?: string;
  color_palette: string[];
  mood: string;
}

export interface ProductResult {
  name: string;
  price: number;
  currency: string;
  url?: string;
  image_url?: string;
  source: string;
  style_match: number;
}

export interface ShoppingList {
  items: ProductResult[];
  total: number;
  currency: string;
}

export interface TranscriptLine {
  text: string;
  role: 'user' | 'assistant';
  timestamp: number;
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Pydantic models and TypeScript type definitions"
```

---

## Task 2: Cloud Services (Firestore + GCS)

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/firestore.py`
- Create: `backend/app/services/cloud_storage.py`

**Step 1: Create Firestore service**

`backend/app/services/__init__.py`: empty file

`backend/app/services/firestore.py`:
```python
import uuid
from datetime import datetime, timezone
from google.cloud import firestore
from app.config import FIRESTORE_COLLECTION

_db = None

def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client()
    return _db


def save_room_analysis(session_id: str, analysis: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("analyses").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id


def get_latest_analysis(session_id: str) -> dict | None:
    db = _get_db()
    docs = (
        db.collection(FIRESTORE_COLLECTION)
        .document(session_id)
        .collection("analyses")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    for doc in docs:
        return doc.to_dict()
    return None


def save_design(session_id: str, design: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("designs").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **design,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id


def get_designs(session_id: str) -> list[dict]:
    db = _get_db()
    docs = (
        db.collection(FIRESTORE_COLLECTION)
        .document(session_id)
        .collection("designs")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(20)
        .stream()
    )
    return [doc.to_dict() for doc in docs]


def save_shopping_list(session_id: str, shopping_list: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("shopping").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **shopping_list,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id
```

**Step 2: Create Cloud Storage service**

`backend/app/services/cloud_storage.py`:
```python
import base64
import uuid
import logging
from google.cloud import storage
from app.config import GCS_BUCKET_NAME

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = storage.Client()
    return _client


def upload_image_b64(image_b64: str, session_id: str, prefix: str = "designs") -> str | None:
    try:
        image_data = base64.b64decode(image_b64)
        client = _get_client()
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{prefix}/{session_id}/{uuid.uuid4()}.jpg"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(image_data, content_type="image/jpeg")
        blob.make_public()
        return blob.public_url
    except Exception as e:
        logger.error(f"GCS upload failed: {e}")
        return None
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Firestore and Cloud Storage services"
```

---

## Task 3: Agent Tools

**Files:**
- Create: `backend/app/tools/__init__.py`
- Create: `backend/app/tools/spatial.py`
- Create: `backend/app/tools/design.py`
- Create: `backend/app/tools/shopping.py`

**Step 1: Create spatial analysis tool**

`backend/app/tools/__init__.py`: empty file

`backend/app/tools/spatial.py`:
```python
import json
import logging
from app.services.firestore import save_room_analysis

logger = logging.getLogger(__name__)


def analyze_room(
    session_id: str,
    room_type: str,
    estimated_dimensions: str,
    current_style: str,
    lighting: str,
    furniture_json: str,
    color_palette_json: str,
    notes: str = "",
) -> dict:
    """Analyze a room based on camera observations. Call this after observing the room through the camera.

    Args:
        session_id: The current session ID.
        room_type: Type of room (e.g., "living room", "bedroom", "kitchen").
        estimated_dimensions: Estimated room dimensions (e.g., "4m x 5m").
        current_style: Current design style (e.g., "modern minimalist", "traditional").
        lighting: Lighting description (e.g., "bright natural light from south windows").
        furniture_json: JSON array of furniture items, each with "name", "style", "estimated_dimensions", "condition".
        color_palette_json: JSON array of hex color strings for dominant colors.
        notes: Additional observations about the space.

    Returns:
        dict with success status and analysis summary.
    """
    try:
        furniture = json.loads(furniture_json) if furniture_json else []
        colors = json.loads(color_palette_json) if color_palette_json else []
    except json.JSONDecodeError:
        furniture = []
        colors = []

    analysis = {
        "room_type": room_type,
        "estimated_dimensions": estimated_dimensions,
        "current_style": current_style,
        "lighting": lighting,
        "furniture": furniture,
        "color_palette": colors,
        "notes": notes,
    }

    doc_id = save_room_analysis(session_id, analysis)
    logger.info(f"Room analysis saved: {doc_id}")

    return {
        "success": True,
        "analysis_id": doc_id,
        "summary": f"{room_type} ({estimated_dimensions}), {current_style} style, {len(furniture)} furniture items detected",
        "analysis": analysis,
    }
```

**Step 2: Create design generation tool**

`backend/app/tools/design.py`:
```python
import base64
import logging
from google import genai
from app.config import IMAGE_GEN_MODEL
from app.services.cloud_storage import upload_image_b64
from app.services.firestore import save_design

logger = logging.getLogger(__name__)


def generate_redesign(
    session_id: str,
    room_description: str,
    target_style: str,
    specific_requests: str = "",
    color_preferences: str = "",
) -> dict:
    """Generate a photorealistic redesign image for a room.

    Args:
        session_id: The current session ID.
        room_description: Description of the current room (from spatial analysis).
        target_style: Target design style (e.g., "mid-century modern", "Scandinavian").
        specific_requests: Any specific user requests (e.g., "keep the bookshelf", "add plants").
        color_preferences: Preferred color palette description.

    Returns:
        dict with success status, image URL, and design details.
    """
    prompt = (
        f"Professional interior design photograph of a {room_description} "
        f"redesigned in {target_style} style. "
        f"{'Specific details: ' + specific_requests + '. ' if specific_requests else ''}"
        f"{'Color palette: ' + color_preferences + '. ' if color_preferences else ''}"
        f"Photorealistic, magazine-quality, natural lighting, high resolution."
    )

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model=IMAGE_GEN_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        image_b64 = None
        description = ""
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_b64 = base64.b64encode(part.inline_data.data).decode()
            elif part.text:
                description = part.text

        if not image_b64:
            return {"success": False, "error": "No image generated"}

        image_url = upload_image_b64(image_b64, session_id, prefix="designs")

        design_data = {
            "style": target_style,
            "description": description or prompt,
            "image_url": image_url,
            "prompt_used": prompt,
        }
        save_design(session_id, design_data)

        return {
            "success": True,
            "image_b64": image_b64,
            "image_url": image_url,
            "style": target_style,
            "description": description or f"Room redesigned in {target_style} style",
            "prompt_used": prompt,
        }
    except Exception as e:
        logger.error(f"Design generation failed: {e}")
        return {"success": False, "error": str(e)}


def generate_color_palette(style: str, room_type: str) -> dict:
    """Generate a color palette for a design style.

    Args:
        style: Design style (e.g., "mid-century modern").
        room_type: Type of room (e.g., "living room").

    Returns:
        dict with color palette details.
    """
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=(
                f"Generate a color palette for a {room_type} in {style} style. "
                f"Return exactly 5 hex color codes with names, formatted as JSON array: "
                f'[{{"hex": "#RRGGBB", "name": "Color Name"}}]. Only JSON, no other text.'
            ),
        )
        import json
        palette = json.loads(response.text.strip().strip("```json").strip("```"))
        return {"success": True, "palette": palette, "style": style}
    except Exception as e:
        logger.error(f"Palette generation failed: {e}")
        return {"success": False, "error": str(e)}
```

**Step 3: Create shopping tool**

`backend/app/tools/shopping.py`:
```python
import json
import logging
from google import genai
from app.services.firestore import save_shopping_list

logger = logging.getLogger(__name__)


def search_furniture(
    session_id: str,
    query: str,
    style: str,
    max_budget: float = 0,
    room_type: str = "",
) -> dict:
    """Search for furniture items matching a style and description.

    Args:
        session_id: The current session ID.
        query: What to search for (e.g., "mid-century modern sofa", "Scandinavian dining table").
        style: Target design style.
        max_budget: Maximum budget in USD (0 = no limit).
        room_type: Type of room the furniture is for.

    Returns:
        dict with list of product results.
    """
    try:
        client = genai.Client()
        budget_str = f" under ${max_budget}" if max_budget > 0 else ""
        prompt = (
            f"You are a furniture shopping assistant. Find 3-5 real furniture products matching: "
            f"'{query}' in {style} style{budget_str}. "
            f"Return a JSON array of products with these fields: "
            f'"name" (str), "price" (number in USD), "source" (store name like IKEA, West Elm, etc), '
            f'"url" (realistic product URL), "style_match" (0-1 float). '
            f"Only return the JSON array, no other text."
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        products = json.loads(response.text.strip().strip("```json").strip("```"))
        total = sum(p.get("price", 0) for p in products)

        result = {
            "success": True,
            "products": products,
            "total": total,
            "query": query,
            "style": style,
        }

        save_shopping_list(session_id, {
            "items": products,
            "total": total,
            "currency": "USD",
            "query": query,
        })

        return result
    except Exception as e:
        logger.error(f"Furniture search failed: {e}")
        return {"success": False, "error": str(e), "products": []}


def build_complete_shopping_list(
    session_id: str,
    items_json: str,
) -> dict:
    """Compile a complete shopping list with totals from previously found items.

    Args:
        session_id: The current session ID.
        items_json: JSON array of items to include, each with "name", "price", "source", "url".

    Returns:
        dict with organized shopping list and totals.
    """
    try:
        items = json.loads(items_json) if items_json else []
        total = sum(item.get("price", 0) for item in items)

        shopping_list = {
            "items": items,
            "total": round(total, 2),
            "currency": "USD",
            "item_count": len(items),
        }

        save_shopping_list(session_id, shopping_list)

        return {"success": True, **shopping_list}
    except Exception as e:
        logger.error(f"Shopping list build failed: {e}")
        return {"success": False, "error": str(e)}
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add agent tools — spatial analysis, design generation, shopping"
```

---

## Task 4: ADK Agents (Root + Sub-Agents)

**Files:**
- Create: `backend/app/agents/__init__.py`
- Create: `backend/app/agents/root_agent.py`
- Create: `backend/app/prompts/__init__.py`
- Create: `backend/app/prompts/root_system.py`

**Step 1: Create system prompt**

`backend/app/prompts/__init__.py`: empty file

`backend/app/prompts/root_system.py`:
```python
ROOT_SYSTEM_PROMPT = """You are ARCHITECT, a live interior design agent. You help users reimagine their spaces in real-time.

## Your Capabilities
You can SEE through the user's camera, HEAR their voice, and SPEAK back to them. You have three specialized tools:

1. **analyze_room** — Call this when you've observed enough of the room through the camera to understand the space. Describe what you see: room type, dimensions, furniture, style, colors, lighting.

2. **generate_redesign** — Call this when the user requests a style change or redesign. Generate photorealistic images of how the room could look in the new style.

3. **generate_color_palette** — Call this to create a complementary color palette for a design style.

4. **search_furniture** — Call this to find real furniture that matches the design style. Include prices and sources.

5. **build_complete_shopping_list** — Call this to compile all selected items into a final shopping list with totals.

## Conversation Flow

### Phase 1: SCANNING
When the user first connects and shows you their room:
- Describe what you see enthusiastically and specifically
- Note furniture, colors, dimensions, lighting, style
- Call analyze_room once you have a good understanding
- Ask what style they'd like to explore

### Phase 2: DESIGNING
When the user mentions a style preference:
- Acknowledge their taste and explain what that style means
- Call generate_redesign with their preferences
- Present the generated image and describe the transformation
- Offer to adjust (different colors, keep certain pieces, etc.)
- Call generate_color_palette for the suggested palette

### Phase 3: SHOPPING
When the user approves a design or asks about furniture:
- Call search_furniture for key pieces shown in the redesign
- Present options with prices
- Ask about budget constraints
- Call build_complete_shopping_list for the final list

## Voice & Personality
- Enthusiastic but professional — like a talented interior designer on a home show
- Specific and visual in descriptions ("that warm walnut coffee table" not "the table")
- Proactive — suggest ideas, don't just wait for instructions
- Budget-conscious — always mention price ranges
- Use short, conversational sentences (you're speaking, not writing)

## CRITICAL RULES
- ALWAYS describe what you see through the camera — be specific about colors, materials, dimensions
- NEVER generate a redesign without first analyzing the room
- ALWAYS include prices when discussing furniture
- Keep voice responses under 3 sentences — be concise
- When showing redesign images, describe what changed from the original
"""
```

**Step 2: Create root agent with ADK**

`backend/app/agents/__init__.py`: empty file

`backend/app/agents/root_agent.py`:
```python
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from app.config import ORCHESTRATOR_MODEL
from app.prompts.root_system import ROOT_SYSTEM_PROMPT
from app.tools.spatial import analyze_room
from app.tools.design import generate_redesign, generate_color_palette
from app.tools.shopping import search_furniture, build_complete_shopping_list


def create_root_agent() -> LlmAgent:
    tools = [
        FunctionTool(analyze_room),
        FunctionTool(generate_redesign),
        FunctionTool(generate_color_palette),
        FunctionTool(search_furniture),
        FunctionTool(build_complete_shopping_list),
    ]

    agent = LlmAgent(
        name="Architect",
        model=ORCHESTRATOR_MODEL,
        instruction=ROOT_SYSTEM_PROMPT,
        tools=tools,
    )

    return agent
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add ADK root agent with system prompt and tool bindings"
```

---

## Task 5: WebSocket Session & FastAPI Integration

**Files:**
- Modify: `backend/app/main.py` (rewrite with WebSocket + session)

**Step 1: Implement full main.py with WebSocket**

Replace `backend/app/main.py` entirely:

```python
import asyncio
import json
import logging
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from app.config import CORS_ORIGINS, HOST, PORT
from app.agents.root_agent import create_root_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ARCHITECT API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ArchitectSession:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.agent = create_root_agent()
        self.session_service = InMemorySessionService()
        self.runner = None
        self.live_session = None
        self.response_task = None

    async def setup(self):
        session = self.session_service.create_session(
            app_name="architect",
            user_id=self.session_id,
        )
        self.runner = Runner(
            agent=self.agent,
            app_name="architect",
            session_service=self.session_service,
        )
        self.live_session = self.runner.live(session_id=session.id)
        await self.live_session.__aenter__()
        self.response_task = asyncio.create_task(self._stream_responses())

    async def _stream_responses(self):
        try:
            async for event in self.live_session.stream():
                await self._handle_event(event)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Response stream error: {e}")
            await self._send_json({"type": "error", "message": str(e)})

    async def _handle_event(self, event):
        if not event or not event.content or not event.content.parts:
            if event and event.server_content and event.server_content.turn_complete:
                await self._send_json({"type": "turn_complete"})
            return

        for part in event.content.parts:
            if part.text:
                await self._send_json({
                    "type": "transcript",
                    "text": part.text,
                    "role": "assistant",
                })
            elif part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                header = json.dumps({"type": "audio"}).encode()
                await self.websocket.send_bytes(header + b"\x00" + part.inline_data.data)
            elif part.function_response:
                resp = part.function_response.response
                if isinstance(resp, dict):
                    if resp.get("image_b64"):
                        await self._send_json({
                            "type": "design_generated",
                            "design": {
                                "style": resp.get("style", ""),
                                "description": resp.get("description", ""),
                                "image_b64": resp["image_b64"],
                                "image_url": resp.get("image_url"),
                                "color_palette": [],
                                "mood": "",
                            },
                        })
                    if resp.get("products"):
                        await self._send_json({
                            "type": "products_found",
                            "products": resp["products"],
                        })
                    if resp.get("analysis"):
                        await self._send_json({
                            "type": "room_analysis",
                            "analysis": resp["analysis"],
                        })
                    if resp.get("palette"):
                        await self._send_json({
                            "type": "palette_generated",
                            "palette": resp["palette"],
                        })
                    if resp.get("item_count") is not None:
                        await self._send_json({
                            "type": "shopping_list",
                            "list": {
                                "items": resp.get("items", []),
                                "total": resp.get("total", 0),
                                "currency": resp.get("currency", "USD"),
                            },
                        })

        if event.server_content and event.server_content.turn_complete:
            await self._send_json({"type": "turn_complete"})

    async def _send_json(self, data: dict):
        try:
            await self.websocket.send_json(data)
        except Exception as e:
            logger.error(f"Send failed: {e}")

    async def handle_message(self, data):
        if isinstance(data, bytes):
            # Binary: JSON header + null byte + PCM audio
            null_idx = data.index(0)
            audio_bytes = data[null_idx + 1:]
            audio_blob = genai_types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
            await self.live_session.send(input=audio_blob)
        else:
            msg = json.loads(data) if isinstance(data, str) else data
            msg_type = msg.get("type", "")

            if msg_type == "text":
                await self.live_session.send(input=msg.get("text", ""))
            elif msg_type == "video_frame":
                import base64
                frame_data = base64.b64decode(msg["data"])
                image_blob = genai_types.Blob(data=frame_data, mime_type="image/jpeg")
                await self.live_session.send(input=image_blob)

    async def cleanup(self):
        if self.response_task:
            self.response_task.cancel()
            try:
                await self.response_task
            except asyncio.CancelledError:
                pass
        if self.live_session:
            await self.live_session.__aexit__(None, None, None)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "architect"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = ArchitectSession(session_id, websocket)

    try:
        await session.setup()
        await session._send_json({
            "type": "connected",
            "session_id": session_id,
            "message": "ARCHITECT is ready. Show me a room!",
        })

        while True:
            data = await websocket.receive()
            if "text" in data:
                await session.handle_message(data["text"])
            elif "bytes" in data:
                await session.handle_message(data["bytes"])
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await session.cleanup()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add WebSocket session with ADK live streaming integration"
```

---

## Task 6: Frontend — Audio Worklets (Copy from MUSE)

**Files:**
- Create: `frontend/public/pcm-capture-processor.js`
- Create: `frontend/public/pcm-playback-processor.js`

**Step 1: Copy AudioWorklet processors from MUSE**

These are identical to MUSE's — they handle PCM audio capture (48kHz→16kHz downsampling) and playback (24kHz→48kHz upsampling). Copy them directly from `/home/antiraedus/Projects/hackathons/muse/frontend/public/`.

```bash
cp /home/antiraedus/Projects/hackathons/muse/frontend/public/pcm-capture-processor.js \
   /home/antiraedus/Projects/hackathons/architect/frontend/public/
cp /home/antiraedus/Projects/hackathons/muse/frontend/public/pcm-playback-processor.js \
   /home/antiraedus/Projects/hackathons/architect/frontend/public/
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add AudioWorklet processors for PCM capture and playback"
```

---

## Task 7: Frontend — Custom Hooks

**Files:**
- Create: `frontend/src/hooks/useWebSocket.ts`
- Create: `frontend/src/hooks/useAudioCapture.ts`
- Create: `frontend/src/hooks/useAudioPlayback.ts`
- Create: `frontend/src/hooks/useCameraCapture.ts`

**Step 1: Create useWebSocket hook**

Adapt from MUSE pattern — handles binary PCM + JSON events.

`frontend/src/hooks/useWebSocket.ts`:
```typescript
import { useRef, useState, useCallback } from 'react';
import { ArchitectEvent, ConnectionStatus } from '../types/events';

interface UseWebSocketOptions {
  sessionId: string;
  onEvent: (event: ArchitectEvent) => void;
  onAudio: (pcmBytes: ArrayBuffer) => void;
}

export function useWebSocket({ sessionId, onEvent, onAudio }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus('connecting');

    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const url = `${protocol}://${host}/ws/${sessionId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
    };

    ws.onmessage = async (ev) => {
      if (ev.data instanceof Blob) {
        const buf = await ev.data.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const nullIdx = bytes.indexOf(0);
        if (nullIdx === -1) return;
        const audioBytes = buf.slice(nullIdx + 1);
        onAudio(audioBytes);
      } else {
        try {
          const event = JSON.parse(ev.data) as ArchitectEvent;
          onEvent(event);
        } catch { /* ignore parse errors */ }
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('error');
    };
  }, [sessionId, onEvent, onAudio]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const sendBinary = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const header = new TextEncoder().encode(JSON.stringify({ type: 'audio' }));
      const nullByte = new Uint8Array([0]);
      const combined = new Uint8Array(header.length + 1 + buffer.byteLength);
      combined.set(header, 0);
      combined.set(nullByte, header.length);
      combined.set(new Uint8Array(buffer), header.length + 1);
      wsRef.current.send(combined.buffer);
    }
  }, []);

  const sendJSON = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, connect, disconnect, sendBinary, sendJSON };
}
```

**Step 2: Create useAudioCapture hook**

`frontend/src/hooks/useAudioCapture.ts`:
```typescript
import { useRef, useState, useEffect } from 'react';

interface UseAudioCaptureOptions {
  onPCMChunk: (buffer: ArrayBuffer) => void;
  enabled: boolean;
}

export function useAudioCapture({ onPCMChunk, enabled }: UseAudioCaptureOptions) {
  const [audioLevel, setAudioLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      if (workletRef.current) {
        workletRef.current.disconnect();
        workletRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      setAudioLevel(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: 48000 });
        ctxRef.current = ctx;

        await ctx.audioWorklet.addModule('/pcm-capture-processor.js');
        const worklet = new AudioWorkletNode(ctx, 'pcm-capture-processor', {
          processorOptions: { targetSampleRate: 16000, chunkSize: 4096 },
        });
        workletRef.current = worklet;

        worklet.port.onmessage = (e) => {
          if (e.data?.type === 'pcm') onPCMChunk(e.data.buffer);
        };

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);
        source.connect(worklet);
        worklet.connect(ctx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
          setAudioLevel(avg);
          rafRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.error('Audio capture failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, onPCMChunk]);

  return { audioLevel };
}
```

**Step 3: Create useAudioPlayback hook**

`frontend/src/hooks/useAudioPlayback.ts`:
```typescript
import { useRef, useCallback } from 'react';

export function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  const initialize = useCallback(async () => {
    if (workletRef.current) return;
    const ctx = new AudioContext({ sampleRate: 48000 });
    ctxRef.current = ctx;
    await ctx.audioWorklet.addModule('/pcm-playback-processor.js');
    const worklet = new AudioWorkletNode(ctx, 'pcm-playback-processor', {
      processorOptions: { sourceSampleRate: 24000, bufferSize: 48000 * 4 },
      outputChannelCount: [1],
    });
    worklet.connect(ctx.destination);
    workletRef.current = worklet;
  }, []);

  const playAudio = useCallback((audioBuffer: ArrayBuffer) => {
    const node = workletRef.current;
    if (!node) return;
    const copy = audioBuffer.slice(0);
    node.port.postMessage({ type: 'audio', buffer: copy }, [copy]);
  }, []);

  const clearBuffer = useCallback(() => {
    workletRef.current?.port.postMessage({ type: 'clear' });
  }, []);

  return { initialize, playAudio, clearBuffer };
}
```

**Step 4: Create useCameraCapture hook**

`frontend/src/hooks/useCameraCapture.ts`:
```typescript
import { useRef, useState, useEffect } from 'react';

interface UseCameraCaptureOptions {
  onFrame: (jpegB64: string) => void;
  enabled: boolean;
  fps?: number;
  resolution?: number;
}

export function useCameraCapture({ onFrame, enabled, fps = 1, resolution = 768 }: UseCameraCaptureOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: resolution }, height: { ideal: resolution }, facingMode: 'environment' },
        });
        if (cancelled) { mediaStream.getTracks().forEach(t => t.stop()); return; }
        setStream(mediaStream);

        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;

        intervalRef.current = setInterval(() => {
          if (!video.videoWidth) return;
          canvas.width = Math.min(video.videoWidth, resolution);
          canvas.height = Math.min(video.videoHeight, resolution);
          const ctx2d = canvas.getContext('2d')!;
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const b64 = dataUrl.split(',')[1];
          onFrame(b64);
        }, 1000 / fps);
      } catch (err) {
        console.error('Camera capture failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, fps, resolution, onFrame]);

  return { stream };
}
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add custom hooks — WebSocket, audio capture/playback, camera"
```

---

## Task 8: Frontend — UI Components

**Files:**
- Create: `frontend/src/components/CameraPreview.tsx`
- Create: `frontend/src/components/TranscriptPanel.tsx`
- Create: `frontend/src/components/DesignGallery.tsx`
- Create: `frontend/src/components/ShoppingPanel.tsx`
- Create: `frontend/src/components/StatusBar.tsx`
- Create: `frontend/src/components/RoomAnalysisCard.tsx`

**Step 1: Create all components**

`frontend/src/components/CameraPreview.tsx`:
```tsx
interface CameraPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export function CameraPreview({ stream, isActive }: CameraPreviewProps) {
  const videoRef = (el: HTMLVideoElement | null) => {
    if (el && stream) { el.srcObject = stream; }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          {isActive ? 'Starting camera...' : 'Camera off'}
        </div>
      )}
      {isActive && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">LIVE</span>
        </div>
      )}
    </div>
  );
}
```

`frontend/src/components/TranscriptPanel.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { TranscriptLine } from '../types/events';

interface TranscriptPanelProps {
  lines: TranscriptLine[];
}

export function TranscriptPanel({ lines }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full p-4">
      {lines.length === 0 && (
        <p className="text-gray-500 text-sm text-center mt-8">
          Start a session and show me a room...
        </p>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
            line.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 rounded-bl-sm'
          }`}>
            {line.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

`frontend/src/components/DesignGallery.tsx`:
```tsx
import { useState } from 'react';
import { DesignConcept } from '../types/events';

interface DesignGalleryProps {
  designs: DesignConcept[];
}

export function DesignGallery({ designs }: DesignGalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);

  if (designs.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center p-8">
        Redesign images will appear here...
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {designs.map((design, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => setSelected(selected === i ? null : i)}
          >
            <img
              src={design.image_b64 ? `data:image/jpeg;base64,${design.image_b64}` : design.image_url}
              alt={design.description}
              className="w-full aspect-square object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <span className="text-xs text-white font-medium">{design.style}</span>
            </div>
          </div>
        ))}
      </div>
      {selected !== null && designs[selected] && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <img
            src={designs[selected].image_b64 ? `data:image/jpeg;base64,${designs[selected].image_b64}` : designs[selected].image_url}
            alt={designs[selected].description}
            className="w-full rounded-lg mb-3"
          />
          <p className="text-sm text-gray-300">{designs[selected].description}</p>
          {designs[selected].color_palette.length > 0 && (
            <div className="flex gap-2 mt-2">
              {designs[selected].color_palette.map((color, j) => (
                <div key={j} className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

`frontend/src/components/ShoppingPanel.tsx`:
```tsx
import { ProductResult } from '../types/events';

interface ShoppingPanelProps {
  products: ProductResult[];
  total: number;
}

export function ShoppingPanel({ products, total }: ShoppingPanelProps) {
  if (products.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center p-8">
        Furniture recommendations will appear here...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {products.map((product, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white">{product.name}</h4>
            <p className="text-xs text-gray-400">{product.source}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-green-400">${product.price}</span>
            {product.url && (
              <a href={product.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-400 hover:underline">
                View
              </a>
            )}
          </div>
        </div>
      ))}
      {total > 0 && (
        <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
          <span className="text-sm text-gray-400">Estimated Total</span>
          <span className="text-lg font-bold text-white">${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
```

`frontend/src/components/StatusBar.tsx`:
```tsx
import { ConnectionStatus, AgentPhase } from '../types/events';

interface StatusBarProps {
  status: ConnectionStatus;
  phase: AgentPhase | null;
  isMicOn: boolean;
  isCameraOn: boolean;
}

const phaseLabels: Record<AgentPhase, string> = {
  scanning: 'Scanning Room',
  designing: 'Generating Design',
  shopping: 'Finding Furniture',
  summary: 'Summary',
};

export function StatusBar({ status, phase, isMicOn, isCameraOn }: StatusBarProps) {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs text-gray-400 capitalize">{status}</span>
      </div>
      {phase && (
        <span className="text-xs text-blue-400 font-medium">{phaseLabels[phase]}</span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{isMicOn ? 'Mic ON' : 'Mic OFF'}</span>
        <span>{isCameraOn ? 'Cam ON' : 'Cam OFF'}</span>
      </div>
    </div>
  );
}
```

`frontend/src/components/RoomAnalysisCard.tsx`:
```tsx
import { RoomAnalysis } from '../types/events';

interface RoomAnalysisCardProps {
  analysis: RoomAnalysis | null;
}

export function RoomAnalysisCard({ analysis }: RoomAnalysisCardProps) {
  if (!analysis) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-bold text-white">Room Analysis</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-gray-400">Type:</span> <span className="text-white">{analysis.room_type}</span></div>
        <div><span className="text-gray-400">Size:</span> <span className="text-white">{analysis.estimated_dimensions || 'N/A'}</span></div>
        <div><span className="text-gray-400">Style:</span> <span className="text-white">{analysis.current_style}</span></div>
        <div><span className="text-gray-400">Light:</span> <span className="text-white">{analysis.lighting}</span></div>
      </div>
      {analysis.furniture.length > 0 && (
        <div>
          <span className="text-xs text-gray-400">Furniture ({analysis.furniture.length}):</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.furniture.map((item, i) => (
              <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded">{item.name}</span>
            ))}
          </div>
        </div>
      )}
      {analysis.color_palette.length > 0 && (
        <div className="flex gap-1">
          {analysis.color_palette.map((color, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add UI components — camera, transcript, design gallery, shopping, status"
```

---

## Task 9: Frontend — Main App Assembly

**Files:**
- Modify: `frontend/src/App.tsx` (full rewrite)

**Step 1: Wire everything together in App.tsx**

```tsx
import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useCameraCapture } from './hooks/useCameraCapture';
import { CameraPreview } from './components/CameraPreview';
import { TranscriptPanel } from './components/TranscriptPanel';
import { DesignGallery } from './components/DesignGallery';
import { ShoppingPanel } from './components/ShoppingPanel';
import { StatusBar } from './components/StatusBar';
import { RoomAnalysisCard } from './components/RoomAnalysisCard';
import {
  ArchitectEvent, AgentPhase, TranscriptLine, DesignConcept,
  ProductResult, RoomAnalysis,
} from './types/events';

type Tab = 'transcript' | 'designs' | 'shopping';

export default function App() {
  const [sessionId] = useState(() => `arch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [phase, setPhase] = useState<AgentPhase | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [designs, setDesigns] = useState<DesignConcept[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [shoppingTotal, setShoppingTotal] = useState(0);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const audioInitRef = useRef(false);

  const { playAudio, initialize: initAudio } = useAudioPlayback();

  const onEvent = useCallback((event: ArchitectEvent) => {
    switch (event.type) {
      case 'connected':
        setTranscript(prev => [...prev, { text: event.message, role: 'assistant', timestamp: Date.now() }]);
        break;
      case 'transcript':
        setTranscript(prev => [...prev, { text: event.text, role: event.role, timestamp: Date.now() }]);
        break;
      case 'phase_change':
        setPhase(event.phase);
        break;
      case 'room_analysis':
        setRoomAnalysis(event.analysis);
        break;
      case 'design_generated':
        setDesigns(prev => [...prev, event.design]);
        setActiveTab('designs');
        break;
      case 'products_found':
        setProducts(prev => [...prev, ...event.products]);
        setShoppingTotal(prev => prev + event.products.reduce((sum, p) => sum + p.price, 0));
        setActiveTab('shopping');
        break;
      case 'shopping_list':
        setProducts(event.list.items);
        setShoppingTotal(event.list.total);
        setActiveTab('shopping');
        break;
      case 'error':
        setTranscript(prev => [...prev, { text: `Error: ${event.message}`, role: 'assistant', timestamp: Date.now() }]);
        break;
    }
  }, []);

  const onAudio = useCallback((pcmBytes: ArrayBuffer) => {
    playAudio(pcmBytes);
  }, [playAudio]);

  const { status, connect, disconnect, sendBinary, sendJSON } = useWebSocket({ sessionId, onEvent, onAudio });

  const { audioLevel } = useAudioCapture({ onPCMChunk: sendBinary, enabled: isMicOn });
  const { stream: cameraStream } = useCameraCapture({
    onFrame: (b64) => sendJSON({ type: 'video_frame', data: b64 }),
    enabled: isCameraOn,
  });

  const handleStartSession = async () => {
    if (!audioInitRef.current) {
      await initAudio();
      audioInitRef.current = true;
    }
    connect();
    setIsSessionActive(true);
    setIsMicOn(true);
    setIsCameraOn(true);
  };

  const handleEndSession = () => {
    setIsMicOn(false);
    setIsCameraOn(false);
    disconnect();
    setIsSessionActive(false);
    setPhase(null);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'transcript', label: 'Chat' },
    { key: 'designs', label: 'Designs', count: designs.length },
    { key: 'shopping', label: 'Shopping', count: products.length },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      <StatusBar status={status} phase={phase} isMicOn={isMicOn} isCameraOn={isCameraOn} />

      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ARCHITECT</h1>
          <p className="text-xs text-gray-500">Reimagine any space, in real-time</p>
        </div>
        {!isSessionActive ? (
          <button onClick={handleStartSession} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Start Session
          </button>
        ) : (
          <button onClick={handleEndSession} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            End Session
          </button>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Camera + Room Analysis */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col p-4 gap-4 overflow-y-auto">
          <CameraPreview stream={cameraStream} isActive={isCameraOn} />
          {audioLevel > 0 && (
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-100 rounded-full" style={{ width: `${audioLevel * 100}%` }} />
            </div>
          )}
          <RoomAnalysisCard analysis={roomAnalysis} />
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              disabled={!isSessionActive}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                isMicOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-800 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {isMicOn ? 'Mute' : 'Unmute'}
            </button>
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              disabled={!isSessionActive}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCameraOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-800 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {isCameraOn ? 'Cam Off' : 'Cam On'}
            </button>
          </div>
        </div>

        {/* Right: Tabbed content */}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-gray-800">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count ? <span className="ml-1.5 text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">{tab.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'transcript' && <TranscriptPanel lines={transcript} />}
            {activeTab === 'designs' && <DesignGallery designs={designs} />}
            {activeTab === 'shopping' && <ShoppingPanel products={products} total={shoppingTotal} />}
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: assemble main App with all hooks and components wired together"
```

---

## Task 10: Deployment Scripts

**Files:**
- Create: `deploy/cloudbuild.yaml`
- Create: `deploy/service.yaml`
- Create: `deploy/setup.sh`

**Step 1: Create Cloud Build pipeline**

`deploy/cloudbuild.yaml`:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/architect-backend:$COMMIT_SHA', '-t', 'gcr.io/$PROJECT_ID/architect-backend:latest', './backend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/architect-backend:$COMMIT_SHA']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/architect-backend:latest']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'architect-backend'
      - '--image=gcr.io/$PROJECT_ID/architect-backend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--timeout=3600'
      - '--session-affinity'
      - '--set-secrets=GOOGLE_API_KEY=google-api-key:latest'
      - '--set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GCS_BUCKET_NAME=architect-images-$PROJECT_ID,FIRESTORE_COLLECTION=architect_sessions'
      - '--allow-unauthenticated'

  - name: 'node:20'
    dir: 'frontend'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm ci
        VITE_BACKEND_URL=$$(gcloud run services describe architect-backend --region=us-central1 --format='value(status.url)') npm run build
        gsutil -m rsync -r dist/ gs://architect-frontend-$PROJECT_ID/

images:
  - 'gcr.io/$PROJECT_ID/architect-backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/architect-backend:latest'

timeout: '1200s'
```

**Step 2: Create setup script**

`deploy/setup.sh`:
```bash
#!/bin/bash
set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
echo "Setting up ARCHITECT in project: $PROJECT_ID"

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com

# Create GCS buckets
gsutil mb -l us-central1 "gs://architect-images-${PROJECT_ID}" 2>/dev/null || true
gsutil iam ch allUsers:objectViewer "gs://architect-images-${PROJECT_ID}"

gsutil mb -l us-central1 "gs://architect-frontend-${PROJECT_ID}" 2>/dev/null || true
gsutil web set -m index.html "gs://architect-frontend-${PROJECT_ID}"
gsutil iam ch allUsers:objectViewer "gs://architect-frontend-${PROJECT_ID}"

# Firestore (if not already created)
gcloud firestore databases create --location=us-central1 2>/dev/null || true

echo ""
echo "Setup complete! Next steps:"
echo "1. Create API key secret: echo -n 'YOUR_KEY' | gcloud secrets create google-api-key --data-file=-"
echo "2. Deploy: gcloud builds submit --config=deploy/cloudbuild.yaml ."
```

**Step 3: Commit**

```bash
chmod +x deploy/setup.sh
git add -A && git commit -m "feat: add Cloud Build pipeline and GCP setup script"
```

---

## Task 11: README + Architecture Diagram

**Files:**
- Modify: `README.md` (full rewrite with spin-up instructions)
- Create: `deploy/architecture.svg` (or generate programmatically)

**Step 1: Write comprehensive README**

Write a full README with: project description, architecture diagram (ASCII), features, tech stack, local development setup (backend + frontend), environment variables, deployment instructions, and submission info. Follow the structure of MUSE's README but adapted for ARCHITECT.

**Step 2: Create architecture diagram**

Generate an SVG architecture diagram showing: Browser → WebSocket → Cloud Run → ADK Root Agent → Sub-Agents → GCP Services. Can be done with a Python script using basic SVG generation or manually.

**Step 3: Commit**

```bash
git add -A && git commit -m "docs: add README with setup instructions and architecture diagram"
```

---

## Task 12: End-to-End Testing & Polish

**Step 1: Start backend locally**

```bash
cd backend && source .venv/bin/activate
cp .env.example .env  # fill in real API key
python -m app.main
```

**Step 2: Start frontend locally**

```bash
cd frontend && npm run dev
```

**Step 3: Test the full flow**

1. Open http://localhost:5173
2. Click "Start Session"
3. Show camera a room → verify agent describes it
4. Say "make it mid-century modern" → verify image generation
5. Verify shopping results appear
6. End session → verify clean disconnect

**Step 4: Fix any issues found during testing**

**Step 5: Commit fixes**

```bash
git add -A && git commit -m "fix: polish from end-to-end testing"
```

---

## Task 13: Deploy to GCP

**Step 1: Run setup script**

```bash
cd deploy && ./setup.sh
```

**Step 2: Set API key secret**

```bash
echo -n "YOUR_GOOGLE_API_KEY" | gcloud secrets create google-api-key --data-file=-
```

**Step 3: Deploy via Cloud Build**

```bash
cd /home/antiraedus/Projects/hackathons/architect
gcloud builds submit --config=deploy/cloudbuild.yaml .
```

**Step 4: Verify deployment**

```bash
BACKEND_URL=$(gcloud run services describe architect-backend --region=us-central1 --format='value(status.url)')
curl $BACKEND_URL/health
# Expected: {"status":"ok","service":"architect"}
```

**Step 5: Test deployed frontend**

Open the GCS frontend URL in browser and run through the same flow as Task 12.

---

## Task 14: Demo Video + Submission

**Step 1: Record 4-minute demo video** following the demo script in the design doc

**Step 2: Upload to YouTube**

**Step 3: Submit on Devpost** with:
- Text description
- GitHub repo URL
- GCP deployment proof (screen recording of Cloud Run console)
- Architecture diagram
- Demo video link
- Blog post link (bonus)
- GDG profile link

---

## Summary

| Task | Description | Est. Commits |
|------|-------------|-------------|
| 0 | Project scaffolding | 1 |
| 1 | Pydantic models + TypeScript types | 1 |
| 2 | Cloud services (Firestore + GCS) | 1 |
| 3 | Agent tools (spatial, design, shopping) | 1 |
| 4 | ADK agents (root + prompt) | 1 |
| 5 | WebSocket session + FastAPI | 1 |
| 6 | Audio worklets (copy from MUSE) | 1 |
| 7 | Frontend hooks (WS, audio, camera) | 1 |
| 8 | UI components | 1 |
| 9 | Main App assembly | 1 |
| 10 | Deployment scripts | 1 |
| 11 | README + architecture diagram | 1 |
| 12 | E2E testing + polish | 1 |
| 13 | Deploy to GCP | 0 |
| 14 | Demo video + submission | 0 |
