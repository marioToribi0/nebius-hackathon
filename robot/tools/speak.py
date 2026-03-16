"""Tool: speak text aloud via TTS."""

from langchain_core.tools import tool

import audio.tts as tts


@tool
def speak(text: str) -> str:
    """Speak text aloud using TTS. Use this to explain places, give directions, or respond to the visitor."""
    tts.speak(text)
    return "Spoken."
