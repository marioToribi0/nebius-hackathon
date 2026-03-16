"""
Microphone capture with WebRTC VAD — emits speech segments to a queue.

State machine:
  SILENT    → speech detected   → RECORDING (buffer frames)
  RECORDING → 1.5 s of silence  → emit audio bytes, back to SILENT
"""

import queue
import threading
import wave
import io
from enum import Enum, auto

import pyaudio
import webrtcvad
from loguru import logger

from config import settings

_SAMPLE_RATE = 16000
_CHANNELS = 1
_SAMPLE_WIDTH = 2          # 16-bit PCM
_FRAME_DURATION_MS = 30    # webrtcvad supports 10/20/30 ms
_FRAME_SIZE = int(_SAMPLE_RATE * _FRAME_DURATION_MS / 1000) * _SAMPLE_WIDTH
_SILENCE_FRAMES = int(settings.SILENCE_THRESHOLD_SECS * 1000 / _FRAME_DURATION_MS)


class _State(Enum):
    SILENT = auto()
    RECORDING = auto()


def _pcm_to_wav(pcm: bytes, sample_rate: int = _SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(_CHANNELS)
        wf.setsampwidth(_SAMPLE_WIDTH)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)
    return buf.getvalue()


class AudioListener:
    """
    Background thread that continuously reads from the mic and pushes
    WAV bytes for complete speech segments onto *out_queue*.
    """

    def __init__(self, out_queue: queue.Queue, mute_event: threading.Event):
        """
        Args:
            out_queue:   queue.Queue[bytes] — WAV audio for each speech segment
            mute_event:  threading.Event — when set, mic is muted (no emission)
        """
        self._out_queue = out_queue
        self._mute_event = mute_event
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self):
        self._thread = threading.Thread(target=self._run, daemon=True, name="audio-listener")
        self._thread.start()
        logger.info("AudioListener started")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
        logger.info("AudioListener stopped")

    def _run(self):
        vad = webrtcvad.Vad(settings.VAD_AGGRESSIVENESS)
        pa = pyaudio.PyAudio()

        device_kwargs = {}
        if settings.AUDIO_DEVICE_INDEX >= 0:
            device_kwargs["input_device_index"] = settings.AUDIO_DEVICE_INDEX

        stream = pa.open(
            rate=_SAMPLE_RATE,
            channels=_CHANNELS,
            format=pyaudio.paInt16,
            input=True,
            frames_per_buffer=_FRAME_SIZE // _SAMPLE_WIDTH,
            **device_kwargs,
        )

        state = _State.SILENT
        buffer: list[bytes] = []
        silence_count = 0

        logger.info("AudioListener: mic stream open, VAD aggressiveness={}", settings.VAD_AGGRESSIVENESS)

        try:
            while not self._stop_event.is_set():
                frame = stream.read(_FRAME_SIZE // _SAMPLE_WIDTH, exception_on_overflow=False)

                if self._mute_event.is_set():
                    # Flush whatever was being recorded before going silent
                    if state == _State.RECORDING and buffer:
                        pcm = b"".join(buffer)
                        wav = _pcm_to_wav(pcm)
                        self._out_queue.put(wav)
                        logger.debug(
                            "VAD: mute flush, emitted {} bytes ({} frames)",
                            len(pcm),
                            len(buffer),
                        )
                    state = _State.SILENT
                    buffer.clear()
                    silence_count = 0
                    # Wait until unmuted before reading more frames
                    while self._mute_event.is_set() and not self._stop_event.is_set():
                        self._stop_event.wait(timeout=0.05)
                    continue

                is_speech = vad.is_speech(frame, _SAMPLE_RATE)

                if state == _State.SILENT:
                    if is_speech:
                        state = _State.RECORDING
                        buffer = [frame]
                        silence_count = 0
                        logger.debug("VAD: speech start")
                elif state == _State.RECORDING:
                    buffer.append(frame)
                    if is_speech:
                        silence_count = 0
                    else:
                        silence_count += 1
                        if silence_count >= _SILENCE_FRAMES:
                            pcm = b"".join(buffer)
                            wav = _pcm_to_wav(pcm)
                            self._out_queue.put(wav)
                            logger.debug(
                                "VAD: speech end, emitted {} bytes ({} frames)",
                                len(pcm),
                                len(buffer),
                            )
                            state = _State.SILENT
                            buffer.clear()
                            silence_count = 0
        finally:
            stream.stop_stream()
            stream.close()
            pa.terminate()
            logger.info("AudioListener: mic stream closed")
