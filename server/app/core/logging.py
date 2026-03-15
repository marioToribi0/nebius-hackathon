"""
Global logger configuration.

Import `logger` from this module anywhere in the app:

    from app.core.logging import logger
"""

import logging
import sys

from loguru import logger

# ---------------------------------------------------------------------------
# Loguru format
# ---------------------------------------------------------------------------

_LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
    "<level>{message}</level>"
)


def configure_logging(level: str = "INFO") -> None:
    """
    Set up loguru sink and redirect stdlib logging into loguru.
    Call once at application startup.
    """
    logger.remove()
    logger.add(sys.stdout, format=_LOG_FORMAT, level=level, colorize=True, enqueue=True)

    # Redirect standard-library logging (uvicorn, fastapi, motor…) into loguru
    class _InterceptHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            try:
                level_ = logger.level(record.levelname).name
            except ValueError:
                level_ = str(record.levelno)

            frame, depth = logging.currentframe(), 2
            while frame and frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back  # type: ignore[assignment]
                depth += 1

            logger.opt(depth=depth, exception=record.exc_info).log(
                level_, record.getMessage()
            )

    logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        logging.getLogger(name).handlers = [_InterceptHandler()]


__all__ = ["logger", "configure_logging"]
