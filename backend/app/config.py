"""
AgentDebate Backend — Configuration & Settings
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    huggingface_api_key: str = ""
    google_api_key: str = ""

    # Default Models
    debater_a_model: str = "Qwen/Qwen3.8-2.4T-A95B"
    debater_b_model: str = "deepseek-ai/DeepSeek-V4-Pro-0813"
    judge_model: str = "gemini-2.5-flash"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./agentdebate.db"

    # Debate Defaults
    default_num_rounds: int = 3
    max_tokens_per_turn: int = 1024

    # CORS
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
