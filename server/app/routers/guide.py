import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import logger
from app.core.security import decode_token
from app.databases.mongodb import get_database
from app.databases.redis import get_redis
from app.dependencies import get_current_user
from app.models.user import UserPublic
from app.services.guide.agent import build_guide_agent

router = APIRouter(prefix="/api/guide", tags=["guide"])


# ---------- REST endpoints ----------


@router.get("/places")
async def list_places(_user: UserPublic = Depends(get_current_user)):
    """Return places that have completed research."""
    db = get_database()
    cursor = db.place_research.find(
        {"status": "completed"},
        {"place_key": 1, "place_name": 1, "_id": 0},
    )
    places = await cursor.to_list(length=200)
    return places


class TTSRequest(BaseModel):
    text: str


@router.post("/tts")
async def text_to_speech(
    body: TTSRequest,
    _user: UserPublic = Depends(get_current_user),
):
    """Convert text to speech via ElevenLabs."""
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ElevenLabs API key not configured",
        )

    from elevenlabs import ElevenLabs

    client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)

    def _generate():
        return client.text_to_speech.convert(
            voice_id=settings.ELEVENLABS_VOICE_ID,
            model_id=settings.ELEVENLABS_MODEL_ID,
            text=body.text,
        )

    audio_iter = await asyncio.to_thread(_generate)

    # Collect bytes from the generator
    audio_bytes = b"".join(
        await asyncio.to_thread(lambda: list(audio_iter))
    )

    from fastapi.responses import Response

    return Response(content=audio_bytes, media_type="audio/mpeg")


# ---------- WebSocket endpoint ----------


async def _authenticate_ws(websocket: WebSocket) -> str | None:
    """Extract and verify JWT from WebSocket query params. Returns user_id or None."""
    token = websocket.query_params.get("token")
    if not token:
        return None

    user_id = decode_token(token)
    if not user_id:
        return None

    redis = get_redis()
    stored_token = await redis.get(f"session:{user_id}")
    if stored_token != token:
        return None

    return user_id


@router.websocket("/ws/{place_key}")
async def guide_ws(websocket: WebSocket, place_key: str):
    """WebSocket chat with the guide agent for a specific place."""
    # Authenticate
    user_id = await _authenticate_ws(websocket)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Verify place exists and is completed
    db = get_database()
    place_doc = await db.place_research.find_one(
        {"place_key": place_key, "status": "completed"},
        {"place_name": 1},
    )
    if not place_doc:
        await websocket.close(code=4004, reason="Place not found or not ready")
        return

    place_name = place_doc["place_name"]

    await websocket.accept()
    logger.info("Guide WS connected | user={} place={}", user_id, place_key)

    # Build agent
    agent = build_guide_agent(place_key, place_name)

    # Session-scoped chat history
    from langchain_core.messages import AIMessage, HumanMessage

    chat_history: list = []

    # Send a welcome greeting
    greeting = (
        f"Hello! I'm your Wayfinder guide for **{place_name}**. "
        "Ask me anything about this place — its history, attractions, tips, or what's happening there right now!"
    )
    await websocket.send_json({"type": "token", "text": greeting})
    await websocket.send_json({"type": "done"})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "text": "Invalid JSON"})
                continue

            if data.get("type") != "message" or not data.get("text", "").strip():
                await websocket.send_json({"type": "error", "text": "Invalid message format"})
                continue

            user_text = data["text"].strip()
            chat_history.append(HumanMessage(content=user_text))

            # Stream agent response
            full_response = ""
            try:
                async for event in agent.astream_events(
                    {"messages": chat_history},
                    version="v2",
                ):
                    kind = event.get("event")

                    # Stream only LLM content tokens (not tool calls)
                    if kind == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk")
                        if chunk and hasattr(chunk, "content") and chunk.content:
                            # Skip tool call chunks
                            if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                                continue
                            if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                                continue
                            text = chunk.content
                            if isinstance(text, str) and text:
                                full_response += text
                                await websocket.send_json({"type": "token", "text": text})

                chat_history.append(AIMessage(content=full_response))
                await websocket.send_json({"type": "done"})

            except Exception as e:
                logger.error("Guide agent error: {}", str(e))
                await websocket.send_json({"type": "error", "text": f"Agent error: {str(e)}"})
                # Still append partial response to history if any
                if full_response:
                    chat_history.append(AIMessage(content=full_response))

    except WebSocketDisconnect:
        logger.info("Guide WS disconnected | user={} place={}", user_id, place_key)
    except Exception as e:
        logger.error("Guide WS unexpected error: {}", str(e))
        try:
            await websocket.close(code=1011, reason="Internal error")
        except Exception:
            pass
