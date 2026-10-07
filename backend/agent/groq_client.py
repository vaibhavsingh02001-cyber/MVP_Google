"""
backend/agent/groq_client.py
==============================
Groq API client wrapper for the Recall conversational photo retrieval agent.

Powered by Groq's ultra-fast LPU inference (using Llama 3 models such as
llama-3.3-70b-versatile or llama-3.1-8b-instant).

Handles:
  - Agentic tool-use loop with OpenAI/Groq function calling specifications
  - Structured JSON extraction from model completions
  - Graceful retries with exponential backoff on rate limits / timeouts
  - Fallback via httpx if the groq python package is not installed
"""

import os
import json
import time
import logging
import re
from typing import Any, Callable, Optional
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load root .env
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

log = logging.getLogger("recall.groq")

# Environment configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "")
GROQ_MODEL   = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
MAX_TOKENS   = 2048
MAX_RETRIES  = 3
RETRY_DELAYS = [1, 2, 4]  # seconds


def extract_json(text: str) -> dict:
    """
    Extract the first valid JSON object from an LLM text response.
    Handles responses wrapped in markdown code fences.
    """
    if not text:
        raise ValueError("Empty response text")
    
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = cleaned.replace("```", "").strip()

    # Direct parse attempt
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Find first {...} block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Find first [...] list block if returned as list
    list_match = re.search(r"\[[\s\S]*\]", cleaned)
    if list_match:
        try:
            return {"items": json.loads(list_match.group())}
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON in response: {text[:250]}")


def _convert_tool_to_groq_spec(tool: dict) -> dict:
    """
    Convert internal tool schema to OpenAI/Groq function calling format.
    Accepts Anthropic-style tool dicts (name, description, input_schema)
    and formats them as {"type": "function", "function": {"name", "description", "parameters"}}.
    """
    name = tool.get("name", "")
    description = tool.get("description", "")
    parameters = tool.get("input_schema") or tool.get("parameters", {"type": "object", "properties": {}})

    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


class GroqClient:
    """Lightweight Groq API client with tool-calling and retry support."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "")
        self.model = model or GROQ_MODEL
        self._http = httpx.Client(
            base_url=GROQ_BASE_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def chat_completion(
        self,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        tool_choice: str = "auto",
        response_format: Optional[dict] = None,
        temperature: float = 0.2,
        max_tokens: int = MAX_TOKENS,
    ) -> dict:
        """Call Groq /chat/completions endpoint with exponential backoff."""
        if not self.is_configured():
            raise RuntimeError(
                "GROQ_API_KEY is not set. Please add GROQ_API_KEY to your .env file."
            )

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = [_convert_tool_to_groq_spec(t) for t in tools]
            payload["tool_choice"] = tool_choice

        if response_format:
            payload["response_format"] = response_format

        last_exc = None
        for attempt, delay in enumerate(RETRY_DELAYS):
            try:
                resp = self._http.post("/chat/completions", json=payload)
                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code in (429, 500, 502, 503, 504):
                    log.warning(
                        "Groq API error status %d (attempt %d) - retrying in %ds",
                        resp.status_code, attempt + 1, delay,
                    )
                    time.sleep(delay)
                else:
                    error_text = resp.text
                    log.error("Groq API returned %d: %s", resp.status_code, error_text)
                    raise RuntimeError(f"Groq API error ({resp.status_code}): {error_text}")
            except httpx.RequestError as e:
                last_exc = e
                log.warning("Groq request error (%s) on attempt %d - retrying in %ds", e, attempt + 1, delay)
                time.sleep(delay)

        raise last_exc or RuntimeError("Groq API unavailable after retries")


def _make_client() -> GroqClient:
    return GroqClient()


def call_llm_json(prompt: str, system: Optional[str] = None, max_tokens: int = 1024) -> dict:
    """Convenience helper to call Groq for structured JSON generation."""
    client = _make_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    res = client.chat_completion(
        messages=messages,
        response_format={"type": "json_object"},
        max_tokens=max_tokens,
        temperature=0.1,
    )

    choice = res.get("choices", [{}])[0]
    content = choice.get("message", {}).get("content", "{}")
    return extract_json(content)


def run_tool_loop(
    system: str,
    messages: list[dict],
    tools: list[dict],
    tool_handler: Callable[[str, dict], Any],
    max_rounds: int = 8,
) -> dict:
    """
    Run the Groq agentic tool-use loop synchronously.

    Sends messages to Groq Llama, executes tool calls, appends results,
    and returns the final parsed JSON dict from the agent.
    """
    client = _make_client()

    # Ensure system prompt is the first message
    formatted_messages: list[dict] = []
    if system:
        formatted_messages.append({"role": "system", "content": system})

    # Add conversation history
    for m in messages:
        formatted_messages.append(dict(m))

    for round_num in range(max_rounds):
        resp_data = client.chat_completion(
            messages=formatted_messages,
            tools=tools,
            temperature=0.1,
        )

        choice = resp_data.get("choices", [{}])[0]
        message = choice.get("message", {})
        finish_reason = choice.get("finish_reason")
        tool_calls = message.get("tool_calls")

        # Append assistant response
        formatted_messages.append(message)

        # Check if the assistant issued tool calls
        if tool_calls:
            for tc in tool_calls:
                call_id = tc.get("id", f"call_{round_num}")
                fn_info = tc.get("function", {})
                fn_name = fn_info.get("name", "")
                raw_args = fn_info.get("arguments", "{}")

                try:
                    fn_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    fn_args = {}

                log.info("Groq tool call: %s(%s)", fn_name, json.dumps(fn_args)[:120])
                try:
                    result = tool_handler(fn_name, fn_args)
                except Exception as e:
                    log.error("Tool handler error for %s: %s", fn_name, e)
                    result = {"error": str(e)}

                formatted_messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": fn_name,
                    "content": json.dumps(result),
                })
            continue

        # Finished or returned final text
        content = message.get("content", "")
        if content and content.strip():
            try:
                return extract_json(content)
            except ValueError:
                log.warning("Groq text content is not JSON: %s", content[:200])

        if finish_reason in ("stop", "end_turn") or not tool_calls:
            break

    log.info("Tool loop completed without structured JSON — returning default fallback")
    return {"clusters": [], "question": None, "skip_to_all": True, "confidence": "medium"}
