"""QR code detection using pyzbar with bounding-box overlay."""

import cv2
import numpy as np
from pyzbar import pyzbar
from loguru import logger


def scan_frame(frame: np.ndarray) -> tuple[str | None, np.ndarray]:
    """
    Decode QR codes in *frame*.

    Returns:
        (decoded_value, annotated_frame) where:
          - decoded_value is the first QR payload string, or None if none found
          - annotated_frame has a bounding box + text overlay drawn on a copy
    """
    annotated = frame.copy()
    decoded_objects = pyzbar.decode(frame)

    if not decoded_objects:
        return None, annotated

    obj = decoded_objects[0]
    value = obj.data.decode("utf-8", errors="replace")

    # Draw bounding polygon
    points = obj.polygon
    if len(points) == 4:
        pts = np.array([[p.x, p.y] for p in points], dtype=np.int32)
        cv2.polylines(annotated, [pts], isClosed=True, color=(0, 255, 0), thickness=3)
    else:
        rect = obj.rect
        cv2.rectangle(
            annotated,
            (rect.left, rect.top),
            (rect.left + rect.width, rect.top + rect.height),
            (0, 255, 0),
            3,
        )

    # Draw text label
    x, y = obj.rect.left, obj.rect.top - 10
    cv2.putText(
        annotated,
        value[:40],
        (max(x, 0), max(y, 15)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    logger.debug("QR detected: {!r}", value)
    return value, annotated
