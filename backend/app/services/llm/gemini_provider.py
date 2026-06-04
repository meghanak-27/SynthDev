import os
import json
import requests
from typing import List, Dict, Any, Type
from pydantic import BaseModel
from app.services.llm.base import LLMProvider, T

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        url = f"{self.base_url}/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        
        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            raise Exception(f"Gemini API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Invalid Gemini response structure: {data}") from e

    def generate_structured_json(self, prompt: str, schema_class: Type[T], system_instruction: str = "") -> T:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        url = f"{self.base_url}/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        # Enforce json schema in prompt instructions
        json_schema = json.dumps(schema_class.model_json_schema(), indent=2)
        full_prompt = f"{prompt}\n\nStrictly output JSON conforming to the following JSON schema:\n{json_schema}"

        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            raise Exception(f"Gemini API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Parse and validate with Pydantic
            parsed = schema_class.model_validate_json(raw_text.strip())
            return parsed
        except Exception as e:
            # Secondary check: Try extracting JSON block if model wrapped it
            try:
                cleaned = raw_text.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1]
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                parsed = schema_class.model_validate_json(cleaned.strip())
                return parsed
            except Exception:
                raise Exception(f"Failed to parse or validate Gemini JSON response: {raw_text}") from e

    def generate_embeddings(self, text: str) -> List[float]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        url = f"{self.base_url}/models/text-embedding-004:embedContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": "models/text-embedding-004",
            "content": {
                "parts": [{"text": text}]
            }
        }
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code != 200:
            raise Exception(f"Gemini Embedding Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            return data["embedding"]["values"]
        except KeyError as e:
            raise Exception(f"Invalid Gemini embedding response structure: {data}") from e
