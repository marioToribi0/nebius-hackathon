"""
Wayfinder G1 Robot — Entry Point
"""

import asyncio
import base64
import queue
import threading
import traceback

import cv2
import audio.tts as tts
from langchain_core.messages import AIMessage, HumanMessage
from loguru import logger

from agent.agent import build_agent
from agent.proactive import ProactiveLoop
from agent.state import AgentState
from audio.listener import AudioListener
from audio.transcriber import transcribe
from config import settings
from tools.next_stop import set_agent_state as set_next_stop_state
from tools.read_qr import set_agent_state
from tools.retrieve_rag import make_retrieve_rag_tool
from ui.app import RobotUI
from vision.camera import Camera


def _get_frame_b64(camera: Camera) -> str | None:
    frame = camera.get_frame()
    if frame is None:
        return None
    _, buf = cv2.imencode(".jpg", frame)
    return base64.b64encode(buf.tobytes()).decode()


def main() -> None:
    logger.info("Wayfinder G1 starting up")

    agent_state: AgentState = {
        "messages": [],
        "place_key": None,
        "place_name": None,
        "context": None,
        "qr_mode": False,
        "current_frame": None,
        "current_stop_index": 0,
        "completed_stops": [],
    }

    mute_event = threading.Event()
    transcript_queue: queue.Queue[bytes] = queue.Queue()

    set_agent_state(agent_state)      # type: ignore[arg-type]
    set_next_stop_state(agent_state)  # type: ignore[arg-type]

    camera = Camera()
    camera.start()

    listener = AudioListener(transcript_queue, mute_event)
    listener.start()

    agent = build_agent(agent_state)
    agent_lock = threading.Lock()
    proactive = ProactiveLoop()

    # ------------------------------------------------------------------
    # Dedicated event loop for the agent — lives in its own thread so
    # asyncio.run() conflicts and LangGraph scheduler issues are avoided.
    # ------------------------------------------------------------------
    _loop = asyncio.new_event_loop()

    def _start_loop():
        asyncio.set_event_loop(_loop)
        _loop.run_forever()

    threading.Thread(target=_start_loop, daemon=True, name="agent-loop").start()

    def run_agent_sync(state: AgentState) -> dict:
        """Submit agent invocation to the dedicated loop and wait for result."""
        future = asyncio.run_coroutine_threadsafe(_run_agent(state), _loop)
        return future.result(timeout=120)

    async def _run_agent(state: AgentState) -> dict:
        nonlocal agent
        with agent_lock:
            logger.debug("Agent invoking LLM...")
            result = await agent.ainvoke(state)
            state["messages"] = result.get("messages", state["messages"])

            # Auto-speak: always speak the last AIMessage text if it has content.
            # The speak tool is optional — this guarantees the robot is never silent.
            msgs = result.get("messages", [])
            for m in reversed(msgs):
                if isinstance(m, AIMessage):
                    text = m.content if isinstance(m.content, str) else ""
                    if not text and isinstance(m.content, list):
                        text = " ".join(
                            p.get("text", "") for p in m.content
                            if isinstance(p, dict) and p.get("type") == "text"
                        )
                    if text.strip():
                        logger.info("Speaking: {!r}", text[:120])
                        try:
                            await asyncio.to_thread(tts.speak, text)
                        except Exception as exc:
                            logger.error("TTS failed: {}", exc)
                    break

            if state.pop("_context_just_loaded", False) and state.get("place_key"):
                logger.info("Context loaded for {!r}, rebuilding agent", state["place_key"])
                state["current_stop_index"] = 0
                state["completed_stops"] = []
                rag_tool = make_retrieve_rag_tool(state["place_key"])
                agent = build_agent(state, extra_tools=[rag_tool])
                proactive.start(state, run_agent_sync)

            return result

    # ------------------------------------------------------------------
    # Transcript consumer
    # ------------------------------------------------------------------

    def consume() -> None:
        while True:
            try:
                wav_bytes = transcript_queue.get()
                text = transcribe(wav_bytes)
                if not text:
                    continue

                logger.info("User said: {!r}", text)
                agent_state["current_frame"] = None
                agent_state["messages"] = [HumanMessage(content=text)]

                run_agent_sync(agent_state)
            except Exception:
                logger.error("Transcript consumer error:\n{}", traceback.format_exc())

    threading.Thread(target=consume, daemon=True, name="transcript-consumer").start()

    ui = RobotUI(agent_state, mute_event, camera)
    logger.info("Wayfinder G1 ready — Tkinter mainloop starting")
    ui.mainloop()

    logger.info("Shutting down")
    listener.stop()
    proactive.stop()
    camera.stop()
    _loop.call_soon_threadsafe(_loop.stop)


if __name__ == "__main__":
    main()
