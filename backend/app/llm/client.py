"""Anthropic API client with model routing, retries, vision, structured output, and Langfuse tracing."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import os
from typing import Any, TypeVar

import anthropic
from pydantic import BaseModel

from app.llm.prompts import (
    fix_suggestion_system_prompt,
    fix_suggestion_user_prompt,
    navigation_system_prompt,
    navigation_user_prompt,
    persona_from_description_prompt,
    persona_from_template_prompt,
    persona_generation_system_prompt,
    report_generation_system_prompt,
    report_generation_user_prompt,
    screenshot_analysis_system_prompt,
    screenshot_analysis_user_prompt,
    session_summary_system_prompt,
    session_summary_user_prompt,
    synthesis_system_prompt,
    synthesis_user_prompt,
)
from app.llm.schemas import (
    FixSuggestion,
    NavigationDecision,
    PersonaProfile,
    ReportContent,
    ScreenshotAnalysis,
    SessionSummary,
    StudySynthesis,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Model constants — overridable via env
OPUS_MODEL = os.getenv("OPUS_MODEL", "claude-opus-4-6")
SONNET_MODEL = os.getenv("SONNET_MODEL", "claude-sonnet-4-5-20250929")

# Pipeline stage → default model mapping
STAGE_MODEL_MAP: dict[str, str] = {
    "persona_generation": OPUS_MODEL,
    "navigation": SONNET_MODEL,
    "screenshot_analysis": OPUS_MODEL,
    "synthesis": OPUS_MODEL,
    "report_generation": OPUS_MODEL,
    "session_summary": SONNET_MODEL,
    "fix_suggestion": SONNET_MODEL,
}

MAX_RETRIES = 3
BASE_RETRY_DELAY = 1.0  # seconds


class TokenUsage:
    """Tracks token usage across a study run."""

    def __init__(self) -> None:
        self.input_tokens: int = 0
        self.output_tokens: int = 0
        self.calls: int = 0

    def record(self, input_tokens: int, output_tokens: int) -> None:
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.calls += 1

    def to_dict(self) -> dict[str, int]:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.input_tokens + self.output_tokens,
            "api_calls": self.calls,
        }


def _init_langfuse():
    """Initialize Langfuse client if configured."""
    try:
        public_key = os.getenv("LANGFUSE_PUBLIC_KEY", "")
        secret_key = os.getenv("LANGFUSE_SECRET_KEY", "")
        if public_key and secret_key:
            from langfuse import Langfuse
            return Langfuse(
                public_key=public_key,
                secret_key=secret_key,
                host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
            )
    except ImportError:
        logger.debug("langfuse not installed, tracing disabled")
    except Exception as e:
        logger.warning("Failed to initialize Langfuse: %s", e)
    return None


class LLMClient:
    """Wrapper around the Anthropic API with model routing, structured output, and Langfuse tracing."""

    def __init__(
        self,
        api_key: str | None = None,
        stage_model_overrides: dict[str, str] | None = None,
        study_id: str | None = None,
    ) -> None:
        from app.config import settings

        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY"),
        )
        self._model_map = {**STAGE_MODEL_MAP, **(stage_model_overrides or {})}
        self.usage = TokenUsage()
        self._study_id = study_id
        self._langfuse = _init_langfuse()

    def _get_model(self, stage: str) -> str:
        return self._model_map.get(stage, SONNET_MODEL)

    async def _call(
        self,
        stage: str,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int = 4096,
    ) -> str:
        """Make an API call with retries, exponential backoff, and Langfuse tracing."""
        model = self._get_model(stage)
        last_error: Exception | None = None

        # Start Langfuse trace if available
        trace = None
        generation = None
        if self._langfuse:
            try:
                trace = self._langfuse.trace(
                    name=f"mirror-{stage}",
                    metadata={"study_id": self._study_id, "stage": stage},
                )
                generation = trace.generation(
                    name=stage,
                    model=model,
                    input={"system": system[:500], "messages_count": len(messages)},
                    metadata={"max_tokens": max_tokens},
                )
            except Exception as e:
                logger.debug("Langfuse trace creation failed: %s", e)

        for attempt in range(MAX_RETRIES):
            try:
                response = await self._client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    system=system,
                    messages=messages,
                )
                # Track usage
                self.usage.record(
                    response.usage.input_tokens,
                    response.usage.output_tokens,
                )
                # Extract text
                text = ""
                for block in response.content:
                    if block.type == "text":
                        text += block.text

                # End Langfuse generation
                if generation:
                    try:
                        generation.end(
                            output=text[:1000],
                            usage={
                                "input": response.usage.input_tokens,
                                "output": response.usage.output_tokens,
                            },
                        )
                    except Exception:
                        pass

                return text

            except anthropic.RateLimitError as e:
                last_error = e
                delay = BASE_RETRY_DELAY * (2 ** attempt)
                logger.warning(
                    "Rate limited on %s (attempt %d/%d), retrying in %.1fs",
                    stage, attempt + 1, MAX_RETRIES, delay,
                )
                await asyncio.sleep(delay)

            except anthropic.APIStatusError as e:
                last_error = e
                if e.status_code >= 500:
                    delay = BASE_RETRY_DELAY * (2 ** attempt)
                    logger.warning(
                        "Server error %d on %s (attempt %d/%d), retrying in %.1fs",
                        e.status_code, stage, attempt + 1, MAX_RETRIES, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    if generation:
                        try:
                            generation.end(output=str(e), level="ERROR")
                        except Exception:
                            pass
                    raise

        if generation:
            try:
                generation.end(output=str(last_error), level="ERROR")
            except Exception:
                pass

        raise RuntimeError(
            f"LLM call failed after {MAX_RETRIES} retries for stage '{stage}': {last_error}"
        )

    async def _call_structured(
        self,
        stage: str,
        system: str,
        messages: list[dict[str, Any]],
        response_model: type[T],
        max_tokens: int = 4096,
    ) -> T:
        """Make an API call and parse the response into a Pydantic model.

        Retries once with a clarifying prompt if JSON parsing fails.
        """
        raw = await self._call(stage, system, messages, max_tokens)
        try:
            return _parse_json_response(raw, response_model)
        except ValueError:
            # Retry with explicit JSON instruction
            logger.warning("JSON parse failed for %s, retrying with clarification", stage)
            retry_messages = messages + [
                {"role": "assistant", "content": raw},
                {
                    "role": "user",
                    "content": (
                        "Your response was not valid JSON. Please respond with ONLY "
                        "a valid JSON object, no markdown fences, no explanation."
                    ),
                },
            ]
            raw_retry = await self._call(stage, system, retry_messages, max_tokens)
            return _parse_json_response(raw_retry, response_model)

    # ------------------------------------------------------------------
    # Stage 1: Persona Generation
    # ------------------------------------------------------------------

    async def generate_persona_from_template(
        self, template: dict[str, Any]
    ) -> PersonaProfile:
        """Generate a full persona profile from a template."""
        system = persona_from_template_prompt(template)
        messages = [{"role": "user", "content": "Generate the complete persona profile."}]
        return await self._call_structured(
            "persona_generation", system, messages, PersonaProfile
        )

    async def generate_persona_from_description(
        self, description: str
    ) -> PersonaProfile:
        """Generate a full persona profile from a natural language description."""
        system = persona_from_description_prompt(description)
        messages = [{"role": "user", "content": "Generate the complete persona profile."}]
        return await self._call_structured(
            "persona_generation", system, messages, PersonaProfile
        )

    async def generate_persona(self) -> PersonaProfile:
        """Generate a random diverse persona."""
        system = persona_generation_system_prompt()
        messages = [
            {
                "role": "user",
                "content": "Generate a unique, diverse persona for usability testing.",
            }
        ]
        return await self._call_structured(
            "persona_generation", system, messages, PersonaProfile
        )

    # ------------------------------------------------------------------
    # Stage 2: Navigation Decision
    # ------------------------------------------------------------------

    async def navigate_step(
        self,
        persona: dict[str, Any],
        task_description: str,
        behavioral_notes: str,
        screenshot: bytes,
        a11y_tree: str,
        page_url: str,
        page_title: str,
        step_number: int,
        history_summary: str,
    ) -> NavigationDecision:
        """Get the next navigation action for a persona at a given step."""
        system = navigation_system_prompt(persona, task_description, behavioral_notes)

        user_text = navigation_user_prompt(
            step_number=step_number,
            page_url=page_url,
            page_title=page_title,
            a11y_tree=a11y_tree,
            history_summary=history_summary,
        )

        # Build multimodal message with screenshot image
        screenshot_b64 = base64.b64encode(screenshot).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": screenshot_b64,
                        },
                    },
                    {"type": "text", "text": user_text},
                ],
            }
        ]

        return await self._call_structured(
            "navigation", system, messages, NavigationDecision
        )

    # ------------------------------------------------------------------
    # Stage 3: Screenshot Analysis
    # ------------------------------------------------------------------

    async def analyze_screenshot(
        self,
        screenshot: bytes,
        page_url: str,
        page_title: str,
        persona_context: str | None = None,
    ) -> ScreenshotAnalysis:
        """Perform deep UX analysis on a screenshot (post-session pass)."""
        system = screenshot_analysis_system_prompt()
        user_text = screenshot_analysis_user_prompt(page_url, page_title, persona_context)

        screenshot_b64 = base64.b64encode(screenshot).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": screenshot_b64,
                        },
                    },
                    {"type": "text", "text": user_text},
                ],
            }
        ]

        return await self._call_structured(
            "screenshot_analysis", system, messages, ScreenshotAnalysis
        )

    # ------------------------------------------------------------------
    # Stage 4: Cross-Persona Synthesis
    # ------------------------------------------------------------------

    async def synthesize_study(
        self,
        study_url: str,
        tasks: list[str],
        session_summaries: list[dict[str, Any]],
        all_issues: list[dict[str, Any]],
    ) -> StudySynthesis:
        """Synthesize findings across all personas into comparative insights."""
        system = synthesis_system_prompt()
        user_text = synthesis_user_prompt(
            study_url, tasks, session_summaries, all_issues
        )
        messages = [{"role": "user", "content": user_text}]

        return await self._call_structured(
            "synthesis", system, messages, StudySynthesis, max_tokens=8192
        )

    # ------------------------------------------------------------------
    # Stage 5: Report Generation
    # ------------------------------------------------------------------

    async def generate_report(
        self,
        study_url: str,
        synthesis: dict[str, Any],
        session_summaries: list[dict[str, Any]],
        tasks: list[str],
    ) -> ReportContent:
        """Generate a full usability test report."""
        system = report_generation_system_prompt()
        user_text = report_generation_user_prompt(
            study_url, synthesis, session_summaries, tasks
        )
        messages = [{"role": "user", "content": user_text}]

        return await self._call_structured(
            "report_generation", system, messages, ReportContent, max_tokens=8192
        )

    # ------------------------------------------------------------------
    # Session Summary
    # ------------------------------------------------------------------

    async def generate_session_summary(
        self,
        persona_name: str,
        task_description: str,
        steps: list[dict[str, Any]],
    ) -> SessionSummary:
        """Generate a summary of a completed session."""
        system = session_summary_system_prompt()
        user_text = session_summary_user_prompt(persona_name, task_description, steps)
        messages = [{"role": "user", "content": user_text}]

        return await self._call_structured(
            "session_summary", system, messages, SessionSummary
        )

    # ------------------------------------------------------------------
    # Stage 3b: Batch Screenshot Analysis (Iteration 4 optimization)
    # ------------------------------------------------------------------

    async def analyze_screenshots_batch(
        self,
        screenshots: list[tuple[bytes, str, str, str | None]],
    ) -> list[ScreenshotAnalysis]:
        """Batch-analyze multiple screenshots in a single LLM call.

        Each tuple is (screenshot_bytes, page_url, page_title, persona_context).
        Sends all images in one multi-image message to reduce round-trip overhead.
        Falls back to individual calls if batch fails.
        """
        if len(screenshots) <= 1:
            # Not worth batching a single screenshot
            results = []
            for ss_bytes, url, title, ctx in screenshots:
                result = await self.analyze_screenshot(ss_bytes, url, title, ctx)
                results.append(result)
            return results

        system = screenshot_analysis_system_prompt()
        content_blocks: list[dict[str, Any]] = []

        for i, (ss_bytes, url, title, ctx) in enumerate(screenshots):
            ss_b64 = base64.b64encode(ss_bytes).decode("utf-8")
            content_blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": ss_b64,
                },
            })
            label = f"Screenshot {i + 1}: {title} ({url})"
            if ctx:
                label += f" — Persona: {ctx}"
            content_blocks.append({"type": "text", "text": label})

        content_blocks.append({
            "type": "text",
            "text": (
                f"Analyze all {len(screenshots)} screenshots above. Return a JSON ARRAY "
                "of analysis objects, one per screenshot, in the same order as the images."
            ),
        })

        messages = [{"role": "user", "content": content_blocks}]

        try:
            raw = await self._call(
                "screenshot_analysis", system, messages, max_tokens=8192
            )
            # Parse as a list of ScreenshotAnalysis
            text = raw.strip()
            if text.startswith("```"):
                lines = text.split("\n")[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)

            data = json.loads(text)
            if isinstance(data, list):
                return [ScreenshotAnalysis.model_validate(item) for item in data]
            # If it returned a single object, wrap it
            return [ScreenshotAnalysis.model_validate(data)]
        except Exception as e:
            logger.warning(
                "Batch screenshot analysis failed, falling back to individual: %s", e
            )
            # Fallback to individual calls
            results = []
            for ss_bytes, url, title, ctx in screenshots:
                try:
                    result = await self.analyze_screenshot(ss_bytes, url, title, ctx)
                    results.append(result)
                except Exception as inner_e:
                    logger.error("Individual analysis also failed: %s", inner_e)
            return results

    # ------------------------------------------------------------------
    # Stage 6: Fix Suggestion Generation
    # ------------------------------------------------------------------

    async def generate_fix_suggestion(
        self,
        issue_description: str,
        issue_element: str | None = None,
        issue_severity: str = "major",
        issue_heuristic: str | None = None,
        issue_recommendation: str | None = None,
        page_url: str | None = None,
        wcag_criterion: str | None = None,
    ) -> FixSuggestion:
        """Generate a code fix suggestion for a UX issue."""
        system = fix_suggestion_system_prompt()
        user_text = fix_suggestion_user_prompt(
            issue_description=issue_description,
            issue_element=issue_element,
            issue_severity=issue_severity,
            issue_heuristic=issue_heuristic,
            issue_recommendation=issue_recommendation,
            page_url=page_url,
            wcag_criterion=wcag_criterion,
        )
        messages = [{"role": "user", "content": user_text}]
        return await self._call_structured("fix_suggestion", system, messages, FixSuggestion)


# ---------------------------------------------------------------------------
# JSON parsing helper
# ---------------------------------------------------------------------------

def _repair_json(text: str) -> str:
    """Attempt to repair common JSON issues produced by LLMs.

    Handles:
    - Trailing commas before } or ]
    - Improperly escaped quotes inside string values (e.g. \"Gerry\")
    - Single quotes used instead of double quotes
    - Unescaped control characters in strings
    - Missing closing brackets
    """
    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Fix improperly escaped Unicode smart quotes
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")

    # Fix double-escaped quotes: \\"Gerry\\" → \"Gerry\"
    text = re.sub(r'\\\\"', '\\"', text)

    # Fix unescaped newlines inside JSON string values
    # Replace literal newlines between quotes with \\n
    def _fix_string_newlines(match: re.Match) -> str:
        content = match.group(0)
        return content.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")

    text = re.sub(r'"(?:[^"\\]|\\.)*"', _fix_string_newlines, text, flags=re.DOTALL)

    # Balance brackets: count { vs } and [ vs ]
    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")
    if open_braces > 0:
        text += "}" * open_braces
    if open_brackets > 0:
        text += "]" * open_brackets

    return text


def _extract_json_object(text: str) -> str:
    """Extract the first complete JSON object or array from text.

    Handles cases where LLMs add explanatory text before/after the JSON.
    """
    # Find the first { or [
    start = -1
    bracket = ""
    for i, ch in enumerate(text):
        if ch in ("{", "["):
            start = i
            bracket = ch
            break

    if start == -1:
        return text

    # Find the matching closing bracket
    close = "}" if bracket == "{" else "]"
    depth = 0
    in_string = False
    escape_next = False

    for i in range(start, len(text)):
        ch = text[i]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\":
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == bracket:
            depth += 1
        elif ch == close:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    # If we didn't find a match, return from start to end
    return text[start:]


def _parse_json_response(raw: str, model: type[T]) -> T:
    """Extract JSON from an LLM response and parse into a Pydantic model.

    The LLM may wrap JSON in markdown code fences — we handle that.
    Falls back to a lightweight repair pass for common LLM JSON quirks
    (trailing commas, escaped quotes, etc.) before giving up.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        # Remove first line (```json or ```)
        lines = text.split("\n")
        lines = lines[1:]
        # Remove last ``` line
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Try parsing as-is first
    try:
        data = json.loads(text)
        return model.model_validate(data)
    except (json.JSONDecodeError, Exception):
        pass

    # Try extracting the JSON object from surrounding text
    try:
        extracted = _extract_json_object(text)
        data = json.loads(extracted)
        return model.model_validate(data)
    except (json.JSONDecodeError, Exception):
        pass

    # Attempt lightweight repair and retry
    try:
        repaired = _repair_json(text)
        data = json.loads(repaired)
        logger.info("JSON repair succeeded for LLM response")
        return model.model_validate(data)
    except (json.JSONDecodeError, Exception):
        pass

    # Last resort: extract + repair
    try:
        extracted = _extract_json_object(text)
        repaired = _repair_json(extracted)
        data = json.loads(repaired)
        logger.info("JSON extract+repair succeeded for LLM response")
        return model.model_validate(data)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse JSON from LLM response: %s\nRaw: %s", e, text[:500])
        raise ValueError(f"LLM returned invalid JSON: {e}") from e
