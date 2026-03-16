"""Tool: activate QR scan mode until a valid place_key is found."""

import time

from langchain_core.tools import tool
from loguru import logger

import server_client
from vision.camera import Camera
from vision.qr_scanner import scan_frame

# Shared mutable state — injected by main.py after startup
_agent_state: dict | None = None


def set_agent_state(state: dict) -> None:
    """Called by main.py to wire the live agent state into this tool."""
    global _agent_state
    _agent_state = state


@tool
def read_qr() -> str:
    """
    Activate QR scan mode. Continuously reads camera frames until a valid QR code
    is detected and the server confirms it has context for that place ID.
    Returns the place_key string on success, or an error message.
    """
    camera = Camera()
    state = _agent_state

    if state is not None:
        state["qr_mode"] = True
    logger.info("read_qr: QR scan mode activated")

    try:
        deadline = time.monotonic() + 60.0  # 60-second timeout
        last_value: str | None = None

        while time.monotonic() < deadline:
            frame = camera.get_frame()
            if frame is None:
                time.sleep(0.1)
                continue

            value, _ = scan_frame(frame)

            if value and value != last_value:
                last_value = value
                logger.info("read_qr: QR detected {!r}, validating...", value)
                if server_client.validate_place_key(value):
                    logger.info("read_qr: place_key {!r} is valid", value)
                    ctx = server_client.get_context(value)
                    if state is not None and ctx:
                        state["place_key"] = value
                        state["place_name"] = ctx.get("place_name", value)
                        state["context"] = ctx
                        # Signal main loop to rebuild agent with retrieve_rag
                        state["_context_just_loaded"] = True
                    return value
                else:
                    logger.warning("read_qr: place_key {!r} not found on server", value)
                    last_value = None  # allow retry with same code

            time.sleep(0.05)

        return "QR scan timed out after 60 seconds. No valid place QR code was found."
    finally:
        if state is not None:
            state["qr_mode"] = False
        logger.info("read_qr: QR scan mode deactivated")
