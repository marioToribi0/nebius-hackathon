"""ElevenLabs TTS — converts text to speech and plays it via sounddevice."""

import io
import threading

import numpy as np
import sounddevice as sd
from elevenlabs import ElevenLabs
from loguru import logger

from config import settings

_client: ElevenLabs | None = None
_lock = threading.Lock()


def _get_client() -> ElevenLabs:
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
    return _client


def speak(text: str) -> None:
    """Convert *text* to speech and play it synchronously."""
    if not text.strip():
        return

    client = _get_client()
    logger.debug("TTS speak: {!r}", text[:80])

    try:
        with _lock:
            audio_iter = client.text_to_speech.convert(
                voice_id=settings.ELEVENLABS_VOICE_ID,
                text=text,
                model_id=settings.ELEVENLABS_MODEL_ID,
                output_format="pcm_22050",
            )
            # Collect all chunks
            audio_bytes = b"".join(chunk for chunk in audio_iter if chunk)

        # PCM 22050 Hz, 16-bit signed, mono
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        sd.play(audio_np, samplerate=22050, blocking=True)
        logger.debug("TTS playback complete")
    except Exception as exc:
        logger.error("TTS speak failed: {}", exc)
