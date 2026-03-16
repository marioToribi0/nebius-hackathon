"""Whisper API transcription via OpenAI SDK."""

import io
import tempfile
import wave

from openai import OpenAI
from loguru import logger

from config import settings

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> str:
    """
    Transcribe WAV audio bytes using Whisper API.
    Returns the transcript string (empty string on failure).
    """
    client = _get_client()

    # Write to a temp file — openai SDK needs a file-like object with a name
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            result = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="en",
            )
        text = result.text.strip()
        logger.debug("Whisper transcript: {!r}", text)
        return text
    except Exception as exc:
        logger.error("Whisper transcription failed: {}", exc)
        return ""
    finally:
        import os
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
