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
