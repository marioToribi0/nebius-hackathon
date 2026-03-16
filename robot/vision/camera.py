"""Thread-safe camera wrapper (singleton)."""

import threading

import cv2
import numpy as np
from loguru import logger

from config import settings


class Camera:
    """
    Singleton OpenCV VideoCapture wrapper.
    Runs a background thread that continuously grabs frames so that
    `get_frame()` always returns the *latest* frame without blocking.
    """

    _instance: "Camera | None" = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._init()
        return cls._instance

    def _init(self):
        self._cap: cv2.VideoCapture | None = None
        self._frame: np.ndarray | None = None
        self._frame_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._cap = cv2.VideoCapture(settings.CAMERA_INDEX)
        if not self._cap.isOpened():
            logger.warning("Camera index {} could not be opened", settings.CAMERA_INDEX)
        self._thread = threading.Thread(target=self._run, daemon=True, name="camera-reader")
        self._thread.start()
        logger.info("Camera started (index={})", settings.CAMERA_INDEX)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
        if self._cap:
            self._cap.release()
            self._cap = None
        logger.info("Camera stopped")

    def get_frame(self) -> np.ndarray | None:
        """Return the most recent frame (or None if camera not ready)."""
        with self._frame_lock:
            if self._frame is None:
                return None
            return self._frame.copy()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            if self._cap and self._cap.isOpened():
                ret, frame = self._cap.read()
                if ret:
                    with self._frame_lock:
                        self._frame = frame
            else:
                self._stop_event.wait(timeout=0.1)
