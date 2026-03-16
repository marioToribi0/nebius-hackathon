from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent / ".env"


class RobotSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8")

    # Nebius / OpenAI-compatible LLM
    NEBIUS_API_KEY: str = ""
    NEBIUS_BASE_URL: str = "https://api.tokenfactory.us-central1.nebius.com/v1/"
    # Vision model — used when a camera frame is attached to the message
    NEBIUS_VISION_MODEL: str = "Qwen/Qwen2.5-VL-72B-Instruct"
    # Text model — used for text-only turns (better tool-calling, faster, cheaper)
    # Get the exact slug from: https://studio.nebius.com/  → Models → copy API name
    NEBIUS_TEXT_MODEL: str = "Qwen/Qwen2.5-VL-72B-Instruct"  # fallback until correct ID confirmed

    # Whisper (standard OpenAI endpoint)
    OPENAI_API_KEY: str = ""

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL_ID: str = "eleven_monolingual_v1"

    # Tavily
    TAVILY_API_KEY: str = ""

    # Wayfinder server
    SERVER_BASE_URL: str = "http://localhost:8000"
    ROBOT_API_KEY: str = ""

    # Audio
    VAD_AGGRESSIVENESS: int = 2
    SILENCE_THRESHOLD_SECS: float = 1.5

    # Camera
    CAMERA_INDEX: int = 0

    # Audio input device index (-1 = system default, 7 = pulse on most Linux setups)
    AUDIO_DEVICE_INDEX: int = 7

    # Proactive loop
    PROACTIVE_INTERVAL_SECS: float = 10.0


settings = RobotSettings()
