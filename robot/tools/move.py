"""Tool: move robot (stub)."""

from langchain_core.tools import tool
from loguru import logger


@tool
def move(direction: str, distance_meters: float = 0.5) -> str:
    """
    Move the robot in the given direction.
    direction: 'forward' | 'backward' | 'left' | 'right'
    distance_meters: how far to move (default 0.5 m).
    STUB — no hardware connected.
    """
    logger.info("STUB move | {} {:.2f}m", direction, distance_meters)
    return f"Moved {direction} {distance_meters:.2f}m (stub)"
