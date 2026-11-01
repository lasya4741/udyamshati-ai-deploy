import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

class LLMProvider:
    """
    Clean LLM Provider abstraction for UdyamSaarthi Conversational Business Advisor.
    Supports Gemini API via environment variable (GEMINI_API_KEY or GOOGLE_API_KEY).
    If no key is configured, quota is exceeded, or network fails,
    it gracefully degrades to deterministic NLU rules.
    """

    SUPPORTED_FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]

    def __init__(self):
        # Auto-load ai-service/.env if present and not in os.environ
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip('"\''))
            except Exception:
                pass

        raw_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        self.api_key = raw_key.strip().strip("'\"") if raw_key else ""

        raw_model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
        cleaned_model = raw_model.strip().strip("'\"").replace("models/", "") if raw_model else "gemini-3.5-flash-lite"
        self.model_name = cleaned_model if cleaned_model else "gemini-3.5-flash-lite"

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    def _call_gemini_api(self, prompt: str, system_instruction: str = "", model_override: Optional[str] = None) -> Optional[str]:
        if not self.is_available():
            return None

        model_to_use = model_override or self.model_name
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_to_use}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        if system_instruction:
            payload["system_instruction"] = {
                "parts": [{"text": system_instruction}]
            }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(endpoint, data=data_bytes, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # If model is not found, try fallback models
                if not model_override:
                    for fb in self.SUPPORTED_FALLBACK_MODELS:
                        if fb != model_to_use:
                            print(f"[Gemini API Notice] Model '{model_to_use}' returned 404. Trying fallback '{fb}'...")
                            fb_res = self._call_gemini_api(prompt, system_instruction, model_override=fb)
                            if fb_res:
                                self.model_name = fb
                                return fb_res
                print(f"[Gemini API Warning] HTTP 404 Not Found for model '{model_to_use}'.")
            elif e.code == 400:
                print(f"[Gemini API Warning] HTTP 400 Bad Request. Check request format or key.")
            elif e.code == 403:
                print(f"[Gemini API Warning] HTTP 403 Forbidden. Check API permissions.")
            elif e.code == 429:
                print(f"[Gemini API Warning] HTTP 429 Quota Exceeded. Fallback to deterministic rules.")
            else:
                print(f"[Gemini API Warning] HTTP {e.code}. Fallback to deterministic rules.")
        except Exception as e:
            print(f"[Gemini API Network/Timeout Notice]: {e}. Fallback to deterministic rules.")

        return None

    def understand_message(self, text: str, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Uses LLM to extract entities, intent, and missing information from natural/mixed language input.
        """
        if not self.is_available():
            return {}

        system_instruction = (
            "You are Saarthi, an expert rural business advisor NLU engine. "
            "Your job is to analyze entrepreneur messages in English, Hindi, Telugu, or mixed speech. "
            "Extract ALL entities in a single pass (business idea, category, location, capital in INR, land in acres, experience years, skills). "
            "Do not confuse previous known state with new information. "
            "Output strictly valid JSON with keys: language, intent, entities, missing_fields, ready_for_analysis."
        )

        prompt = f"""
Current Session State:
{json.dumps(session_state, ensure_ascii=False, indent=2)}

User Message:
"{text}"

Output strictly a JSON object conforming to:
{{
  "language": "ENGLISH|HINDI|TELUGU|MIXED",
  "intent": "PROVIDE_BUSINESS_INFORMATION|CONFIRM_ANALYSIS|CHANGE_INFORMATION|ASK_QUESTION|GREETING|OTHER",
  "entities": {{
    "business_idea": string or null,
    "category_code": string or null,
    "location": string or null,
    "capital": number or null,
    "land_acres": number or null,
    "experience_years": number or null,
    "skills": array of strings
  }},
  "missing_fields": array of strings,
  "ready_for_analysis": boolean,
  "natural_response": string or null
}}
"""
        response_text = self._call_gemini_api(prompt, system_instruction)
        if response_text:
            try:
                # Strip markdown fence if present
                clean_json = response_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_json)
            except Exception:
                pass

        return {}

    def generate_advisory_response(self, prompt_text: str, language: str = "ENGLISH") -> Optional[str]:
        if not self.is_available():
            return None

        sys_prompt = (
            "You are Saarthi, a warm, knowledgeable, human rural business companion across India. "
            "Speak clearly, encouragingly, and succinctly. "
            "NEVER repeat greetings if context is mid-conversation. "
            "Answer directly in the requested language (English, Hindi, or Telugu)."
        )
        return self._call_gemini_api(prompt_text, sys_prompt)
