"""
Wayfinder G1 Robot — Entry Point

Wires all components and starts the Tkinter main loop.
"""

import asyncio
import base64
import queue
import sys
import threading

import cv2
from langchain_core.messages import HumanMessage
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_frame_b64(camera: Camera) -> str | None:
    frame = camera.get_frame()
    if frame is None:
        return None
    _, buf = cv2.imencode(".jpg", frame)
    return base64.b64encode(buf.tobytes()).decode()


def _build_human_message(text: str, frame_b64: str | None) -> HumanMessage:
    if frame_b64:
        return HumanMessage(
            content=[
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{frame_b64}"},
                },
                {"type": "text", "text": text},
            ]
        )
    return HumanMessage(content=text)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    logger.info("Wayfinder G1 starting up")

    # ------------------------------------------------------------------
    # Shared state
    # ------------------------------------------------------------------
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

    mute_event = threading.Event()      # set = muted
    transcript_queue: queue.Queue[bytes] = queue.Queue()

    # Wire agent state into tools that need it
    set_agent_state(agent_state)        # type: ignore[arg-type]
    set_next_stop_state(agent_state)    # type: ignore[arg-type]

    # ------------------------------------------------------------------
    # Camera
    # ------------------------------------------------------------------
    camera = Camera()
    camera.start()

    # ------------------------------------------------------------------
    # Audio listener
    # ------------------------------------------------------------------
    listener = AudioListener(transcript_queue, mute_event)
    listener.start()

    # ------------------------------------------------------------------
    # Agent (initial — no retrieve_rag yet)
    # ------------------------------------------------------------------
    agent = build_agent(agent_state)
    agent_lock = threading.Lock()
    proactive = ProactiveLoop()

    def agent_runner(state: AgentState) -> dict:
        """Synchronous wrapper used by the proactive loop."""
        return asyncio.run(_run_agent(state))

    async def _run_agent(state: AgentState) -> dict:
        nonlocal agent
        with agent_lock:
            result = await agent.ainvoke(state)
            # Merge updated messages back
            state["messages"] = result.get("messages", state["messages"])

            # If context just loaded, reset tour progress and rebuild agent
            if state.pop("_context_just_loaded", False) and state.get("place_key"):
                logger.info("Context loaded for {!r}, rebuilding agent", state["place_key"])
                state["current_stop_index"] = 0
                state["completed_stops"] = []
                rag_tool = make_retrieve_rag_tool(state["place_key"])
                agent = build_agent(state, extra_tools=[rag_tool])
                proactive.start(state, agent_runner)

            return result

    # ------------------------------------------------------------------
    # Transcript consumer thread
    # ------------------------------------------------------------------

    def consume() -> None:
        while True:
            try:
                wav_bytes = transcript_queue.get()
                text = transcribe(wav_bytes)
                if not text:
                    continue

                logger.info("User said: {!r}", text)
                frame_b64 = _get_frame_b64(camera)
                agent_state["current_frame"] = frame_b64

                msg = _build_human_message(text, frame_b64)
                agent_state["messages"] = [msg]

                asyncio.run(_run_agent(agent_state))
            except Exception as exc:
                logger.error("Transcript consumer error: {}", exc)

    threading.Thread(target=consume, daemon=True, name="transcript-consumer").start()

    # ------------------------------------------------------------------
    # Tkinter UI (blocks until window closed)
    # ------------------------------------------------------------------
    ui = RobotUI(agent_state, mute_event, camera)
    logger.info("Wayfinder G1 ready — Tkinter mainloop starting")
    ui.mainloop()

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    logger.info("Shutting down")
    listener.stop()
    proactive.stop()
    camera.stop()


if __name__ == "__main__":
    main()
