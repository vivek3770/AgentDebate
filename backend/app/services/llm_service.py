"""
AgentDebate Backend — LLM Service Abstraction

Provides a unified interface for streaming text generation from:
- HuggingFace Inference API (Qwen, DeepSeek)
- Google Gemini (Judge)
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import google.generativeai as genai
from huggingface_hub import AsyncInferenceClient

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    """Unified LLM service supporting HuggingFace Inference and Google Gemini."""

    def __init__(self):
        self.settings = get_settings()
        self._hf_client: AsyncInferenceClient | None = None
        self._gemini_configured = False

    def _get_hf_client(self) -> AsyncInferenceClient:
        """Lazy-initialize the HuggingFace async client."""
        if self._hf_client is None:
            self._hf_client = AsyncInferenceClient(
                token=self.settings.huggingface_api_key
            )
        return self._hf_client

    def _ensure_gemini(self):
        """Configure the Gemini SDK once."""
        if not self._gemini_configured:
            genai.configure(api_key=self.settings.google_api_key)
            self._gemini_configured = True

    def _is_gemini_model(self, model_id: str) -> bool:
        """Check if a model ID is a Gemini model."""
        return model_id.startswith("gemini")

    async def generate_stream(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Stream text generation from the appropriate provider.

        Yields individual text tokens/chunks as they arrive.
        """
        if self._is_gemini_model(model_id):
            async for token in self._stream_gemini(
                model_id, system_prompt, user_prompt, max_tokens, temperature
            ):
                yield token
        else:
            async for token in self._stream_huggingface(
                model_id, system_prompt, user_prompt, max_tokens, temperature
            ):
                yield token

    async def generate(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> str:
        """
        Non-streaming generation — used for structured judge output.

        Returns the complete response text.
        """
        if self._is_gemini_model(model_id):
            return await self._generate_gemini(
                model_id, system_prompt, user_prompt, max_tokens, temperature
            )
        else:
            return await self._generate_huggingface(
                model_id, system_prompt, user_prompt, max_tokens, temperature
            )

    # ────────────────── HuggingFace Inference ──────────────────

    async def _stream_huggingface(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        """Stream from HuggingFace Inference API."""
        client = self._get_hf_client()

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            stream = await client.chat.completions.create(
                model=model_id,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"HuggingFace streaming error for {model_id}: {e}")
            raise

    async def _generate_huggingface(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Non-streaming generation from HuggingFace."""
        client = self._get_hf_client()

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            response = await client.chat.completions.create(
                model=model_id,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=False,
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"HuggingFace generation error for {model_id}: {e}")
            raise

    # ──────────────────── Google Gemini ─────────────────────────

    async def _stream_gemini(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[str]:
        """Stream from Google Gemini API."""
        self._ensure_gemini()

        model = genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )

        try:
            response = await model.generate_content_async(
                user_prompt,
                stream=True,
            )

            async for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Gemini streaming error for {model_id}: {e}")
            raise

    async def _generate_gemini(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Non-streaming generation from Gemini."""
        self._ensure_gemini()

        model = genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )

        try:
            response = await model.generate_content_async(user_prompt)
            return response.text

        except Exception as e:
            logger.error(f"Gemini generation error for {model_id}: {e}")
            raise

    def get_available_models(self) -> list[dict]:
        """Return list of available models."""
        return [
            {
                "model_id": "Qwen/Qwen3.8-2.4T-A95B",
                "provider": "huggingface",
                "display_name": "Qwen 3.8 (2.4T)",
                "description": "Qwen's flagship reasoning model — strong at structured argumentation",
            },
            {
                "model_id": "deepseek-ai/DeepSeek-V4-Pro-0813",
                "provider": "huggingface",
                "display_name": "DeepSeek V4 Pro",
                "description": "DeepSeek's advanced model — excels at logical analysis and counterarguments",
            },
            {
                "model_id": "gemini-2.5-flash",
                "provider": "google",
                "display_name": "Gemini 2.5 Flash",
                "description": "Google's fast, capable model — ideal for impartial evaluation",
            },
            {
                "model_id": "gemini-2.5-pro",
                "provider": "google",
                "display_name": "Gemini 2.5 Pro",
                "description": "Google's most capable model — premium evaluation quality",
            },
        ]


# ──────────────── Singleton Instance ───────────────────────────

_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    """Get the singleton LLM service instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
