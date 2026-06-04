from abc import ABC, abstractmethod
from typing import List, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LLMProvider(ABC):
    @abstractmethod
    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generates raw text response for the given prompt."""
        pass

    @abstractmethod
    def generate_structured_json(self, prompt: str, schema_class: Type[T], system_instruction: str = "") -> T:
        """Generates a structured JSON response matching the Pydantic schema class and returns a typed instance."""
        pass

    @abstractmethod
    def generate_embeddings(self, text: str) -> List[float]:
        """Generates embedding vector for the text."""
        pass
