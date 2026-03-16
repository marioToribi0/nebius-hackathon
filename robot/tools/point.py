"""Tool: point arm at a described object (stub)."""

from langchain_core.tools import tool
from loguru import logger


@tool
def point(target_description: str) -> str:
    """
    Point the robot arm toward the described object in the current view.
    STUB — no hardware connected.
    """
    logger.info("STUB point | {}", target_description)
    return f"Pointing at: {target_description} (stub)"
