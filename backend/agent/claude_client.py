"""
backend/agent/claude_client.py
================================
Anthropic API wrapper for the Recall agent.

Handles:
  - Tool-use agentic loop (multi-turn until stop_reason == "end_turn")
  - Retry with exponential backoff on rate limits and timeouts
  - Forced tool-call fallback if Claude returns plain text unexpectedly
  - Structured JSON extraction from final text response
"""

import os
import json
import time
import logging
import re
from typing import Any

import anthropic
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

log = logging.getLogger("recall.claude")

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL         = "claude-3-haiku-20240307"
MAX_TOKENS    = 2048
MAX_RETRIES   = 3
RETRY_DELAYS  = [1, 2, 4]   # seconds


def _make_client() -> anthropic.Anthropic:
    if not ANTHROPIC_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. "
            "Add it to your .env file at the project root."
        )
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def extract_json(text: str) -> dict:
    """
    Extract the first valid JSON object from a Claude text response.
    Handles responses wrapped in markdown code fences.
    """
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = text.replace("```", "").strip()
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find first {...} block
    match = re.search(r"\{[\s\S]+\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"No valid JSON in response: {text[:300]}")


def run_tool_loop(
    system: str,
    messages: list[dict],
    tools: list[dict],
    tool_handler: "callable",
    max_rounds: int = 10,
) -> dict:
    """
    Run the Claude agentic tool-use loop synchronously.

    Sends messages to Claude, handles tool_use blocks by calling `tool_handler`,
    appends tool results, and continues until stop_reason == "end_turn" or max_rounds.

    Args:
        system:       System prompt string.
        messages:     Initial messages list (mutable — appended to in-place).
        tools:        Tool schema list.
        tool_handler: Callable(tool_name: str, tool_input: dict) -> Any
        max_rounds:   Maximum tool-call rounds before giving up.

    Returns:
        The final parsed JSON dict from Claude's last text response.
    """
    client = _make_client()

    for round_num in range(max_rounds):
        response = _call_with_retry(client, system, messages, tools)

        # Collect assistant blocks
        assistant_blocks = response.content
        messages.append({"role": "assistant", "content": assistant_blocks})

        if response.stop_reason == "end_turn":
            # Extract text content from final response
            for block in assistant_blocks:
                if block.type == "text" and block.text.strip():
                    try:
                        return extract_json(block.text)
                    except ValueError:
                        log.warning("Claude end_turn text is not JSON: %s", block.text[:200])
            # No usable text — return empty
            return {"clusters": [], "question": None, "skip_to_all": True, "confidence": "low"}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in assistant_blocks:
                if block.type == "tool_use":
                    log.info("Tool call: %s(%s)", block.name, json.dumps(block.input)[:120])
                    try:
                        result = tool_handler(block.name, block.input)
                    except Exception as e:
                        log.error("Tool handler error for %s: %s", block.name, e)
                        result = {"error": str(e)}
                    tool_results.append({
                        "type":        "tool_result",
                        "tool_use_id": block.id,
                        "content":     json.dumps(result),
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        # Unexpected stop reason
        log.warning("Unexpected stop_reason: %s", response.stop_reason)
        break

    log.error("Tool loop exhausted max_rounds=%d without end_turn", max_rounds)
    return {"clusters": [], "question": None, "skip_to_all": True, "confidence": "low"}


def _call_with_retry(
    client: anthropic.Anthropic,
    system: str,
    messages: list[dict],
    tools: list[dict],
) -> anthropic.types.Message:
    """Call Claude API with exponential backoff on rate limit / timeout errors."""
    last_exc = None
    for attempt, delay in enumerate(RETRY_DELAYS):
        try:
            return client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                tools=tools,
                messages=messages,
            )
        except anthropic.RateLimitError as e:
            last_exc = e
            log.warning("Rate limit hit (attempt %d) — retrying in %ds", attempt + 1, delay)
            time.sleep(delay)
        except anthropic.APITimeoutError as e:
            last_exc = e
            log.warning("API timeout (attempt %d) — retrying in %ds", attempt + 1, delay)
            time.sleep(delay)
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                last_exc = e
                log.warning("API server error %d (attempt %d) — retrying", e.status_code, attempt + 1)
                time.sleep(delay)
            else:
                raise

    raise last_exc or RuntimeError("Claude API unavailable after retries")
