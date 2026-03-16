"""Proactive loop — fires every N seconds when context is loaded."""

import asyncio
import base64
import threading
from typing import Any, Callable

import cv2
from langchain_core.messages import HumanMessage
from loguru import logger

from agent.state import AgentState
from config import settings
from vision.camera import Camera


class ProactiveLoop:
    """
    Background thread that fires every *interval* seconds.
    When context is loaded, it grabs a camera frame and invokes the agent
    so the robot can proactively comment on the environment.
    """

    def __init__(self):
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(
        self,
        state: AgentState,
        agent_runner: Callable[[AgentState], Any],
        interval: float | None = None,
    ) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        _interval = interval or settings.PROACTIVE_INTERVAL_SECS
        self._thread = threading.Thread(
            target=self._run,
            args=(state, agent_runner, _interval),
            daemon=True,
            name="proactive-loop",
        )
        self._thread.start()
        logger.info("ProactiveLoop started (interval={}s)", _interval)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("ProactiveLoop stopped")

    def _run(
        self,
        state: AgentState,
        agent_runner: Callable[[AgentState], Any],
        interval: float,
    ) -> None:
        while not self._stop_event.wait(timeout=interval):
            if not state.get("context"):
                logger.debug("ProactiveLoop: no context loaded, skipping")
                continue
            if state.get("qr_mode"):
                logger.debug("ProactiveLoop: qr_mode active, skipping")
                continue

            camera = Camera()
            frame = camera.get_frame()
            if frame is None:
                logger.debug("ProactiveLoop: no frame available, skipping")
                continue

            _, buf = cv2.imencode(".jpg", frame)
            frame_b64 = base64.b64encode(buf.tobytes()).decode()

            msg = HumanMessage(
                content=[
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{frame_b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Proactive check: look at the current view and decide if there is anything "
                            "useful to tell the visitor. If you see a point of interest, obstacle, or "
                            "something related to the tour, speak about it. Otherwise stay silent."
                        ),
                    },
                ]
            )

            state["current_frame"] = frame_b64
            state["messages"] = [msg]

            try:
                logger.debug("ProactiveLoop: invoking agent")
                asyncio.run(agent_runner(state))
            except Exception as exc:
                logger.error("ProactiveLoop: agent error: {}", exc)
