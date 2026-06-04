import os
import json
import requests
from typing import List, Dict, Any, Type
from pydantic import BaseModel
from app.services.llm.base import LLMProvider, T

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, api_base: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.api_base = api_base.rstrip('/')

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        url = f"{self.api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        # Dynamically select standard model or a local model default
        model = "gpt-3.5-turbo" if "openai.com" in self.api_base else "local-model"
        if os.getenv("OPENAI_MODEL"):
            model = os.getenv("OPENAI_MODEL")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2
        }

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code != 200:
            raise Exception(f"OpenAI API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Invalid OpenAI response structure: {data}") from e

    def generate_structured_json(self, prompt: str, schema_class: Type[T], system_instruction: str = "") -> T:
        url = f"{self.api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        json_schema = json.dumps(schema_class.model_json_schema(), indent=2)
        
        # Get the field names so we can show an example shape
        field_names = list(schema_class.model_fields.keys())
        example_hint = ", ".join([f'"{f}": <value>' for f in field_names])

        full_prompt = (
            f"{prompt}\n\n"
            f"You MUST respond with a JSON object containing actual data values, "
            f"NOT the schema definition itself.\n"
            f"The response shape should look like: {{{example_hint}}}\n"
            f"Conform to this JSON schema:\n{json_schema}"
        )

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": full_prompt})

        model = "gpt-3.5-turbo" if "openai.com" in self.api_base else "local-model"
        if os.getenv("OPENAI_MODEL"):
            model = os.getenv("OPENAI_MODEL")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        last_error = None
        for attempt in range(2):  # retry once if schema-echo detected
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code != 200:
                raise Exception(f"OpenAI API Error: {response.status_code} - {response.text}")
            
            data = response.json()
            try:
                raw_text = data["choices"][0]["message"]["content"]
                cleaned = raw_text.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1]
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                    cleaned = cleaned.strip()

                parsed_dict = json.loads(cleaned)

                # Detect schema-echo: model returned the schema itself, not data
                if "properties" in parsed_dict and "title" in parsed_dict:
                    # On retry, make it even more explicit
                    messages.append({"role": "assistant", "content": raw_text})
                    messages.append({
                        "role": "user",
                        "content": (
                            f"That is the schema definition. I need actual data. "
                            f"Give me a JSON object like: {{{example_hint}}} "
                            f"with real string/array/number values filled in."
                        )
                    })
                    payload["messages"] = messages
                    last_error = ValueError("Model echoed schema definition")
                    continue

                parsed = schema_class.model_validate(parsed_dict)
                return parsed
            except Exception as e:
                last_error = e
                break

        raise Exception(f"Failed to parse or validate OpenAI JSON response after retries") from last_error
    
    def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.api_base}/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        model = "text-embedding-ada-002" if "openai.com" in self.api_base else "local-model"
        payload = {
            "model": model,
            "input": text
        }
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code != 200:
            raise Exception(f"OpenAI Embedding Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            return data["data"][0]["embedding"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Invalid OpenAI embedding response structure: {data}") from e
