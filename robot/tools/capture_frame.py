"""Tool: capture the current camera frame and return it as base64 JPEG."""

import base64

import cv2
from langchain_core.tools import tool
from loguru import logger

from vision.camera import Camera


@tool
def capture_frame() -> str:
    """Capture the current camera frame. Returns a base64-encoded JPEG for visual understanding."""
    camera = Camera()
    frame = camera.get_frame()
    if frame is None:
        logger.warning("capture_frame: no frame available")
        return "No camera frame available."
    _, buf = cv2.imencode(".jpg", frame)
    b64 = base64.b64encode(buf.tobytes()).decode()
    logger.debug("capture_frame: encoded {} bytes", len(buf))
    return b64
