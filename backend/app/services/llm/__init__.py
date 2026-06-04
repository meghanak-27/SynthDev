import os
from app.config import settings
from app.services.llm.base import LLMProvider
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.openai_provider import OpenAIProvider

def get_llm_provider() -> LLMProvider:
    gemini_key = settings.GEMINI_API_KEY
    openai_key = settings.OPENAI_API_KEY
    openai_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")

    if gemini_key:
        return GeminiProvider(api_key=gemini_key)
    elif openai_key:
        return OpenAIProvider(api_key=openai_key, api_base=openai_base)
    else:
        # Graceful fallback that throws a clear error during generation
        class UnconfiguredProvider(LLMProvider):
            def generate_text(self, prompt: str, system_instruction: str = "") -> str:
                raise ValueError("API Keys missing: Please set GEMINI_API_KEY or OPENAI_API_KEY in your .env file to enable dynamic AI generation.")
            def generate_structured_json(self, prompt: str, schema_class, system_instruction: str = ""):
                raise ValueError("API Keys missing: Please set GEMINI_API_KEY or OPENAI_API_KEY in your .env file to enable dynamic AI generation.")
            def generate_embeddings(self, text: str):
                raise ValueError("API Keys missing: Please set GEMINI_API_KEY or OPENAI_API_KEY in your .env file to enable dynamic AI generation.")
        return UnconfiguredProvider()

llm_service = get_llm_provider()
