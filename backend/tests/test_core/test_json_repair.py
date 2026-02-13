"""Tests for LLM JSON response parsing and repair (Iteration 1)."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from app.llm.client import _repair_json, _extract_json_object, _parse_json_response


class SimpleModel(BaseModel):
    name: str
    age: int


class TestRepairJson:
    """Test the _repair_json helper."""

    def test_trailing_commas_removed(self) -> None:
        text = '{"name": "Alice", "age": 30,}'
        result = _repair_json(text)
        assert result == '{"name": "Alice", "age": 30}'

    def test_trailing_comma_in_array(self) -> None:
        text = '{"items": [1, 2, 3,]}'
        result = _repair_json(text)
        assert result == '{"items": [1, 2, 3]}'

    def test_unbalanced_braces_fixed(self) -> None:
        text = '{"name": "Alice", "age": 30'
        result = _repair_json(text)
        assert result.endswith("}")

    def test_smart_quotes_replaced(self) -> None:
        text = '{\u201cname\u201d: \u201cAlice\u201d}'
        result = _repair_json(text)
        assert "\u201c" not in result
        assert "\u201d" not in result


class TestExtractJsonObject:
    """Test the _extract_json_object helper."""

    def test_extracts_from_surrounding_text(self) -> None:
        text = 'Here is the JSON:\n{"name": "Alice", "age": 30}\nEnd of response.'
        result = _extract_json_object(text)
        assert result == '{"name": "Alice", "age": 30}'

    def test_extracts_array(self) -> None:
        text = 'Result: [1, 2, 3] done'
        result = _extract_json_object(text)
        assert result == "[1, 2, 3]"

    def test_handles_nested_objects(self) -> None:
        text = '{"outer": {"inner": true}} extra'
        result = _extract_json_object(text)
        assert result == '{"outer": {"inner": true}}'

    def test_handles_strings_with_braces(self) -> None:
        text = '{"value": "hello {world}"} trailing'
        result = _extract_json_object(text)
        assert result == '{"value": "hello {world}"}'


class TestParseJsonResponse:
    """Test the full _parse_json_response pipeline."""

    def test_clean_json(self) -> None:
        raw = '{"name": "Alice", "age": 30}'
        result = _parse_json_response(raw, SimpleModel)
        assert result.name == "Alice"
        assert result.age == 30

    def test_markdown_fenced_json(self) -> None:
        raw = '```json\n{"name": "Bob", "age": 25}\n```'
        result = _parse_json_response(raw, SimpleModel)
        assert result.name == "Bob"

    def test_json_with_trailing_comma(self) -> None:
        raw = '{"name": "Carol", "age": 40,}'
        result = _parse_json_response(raw, SimpleModel)
        assert result.name == "Carol"

    def test_json_with_surrounding_text(self) -> None:
        raw = 'Here is the persona:\n{"name": "Dave", "age": 35}\nI hope that helps!'
        result = _parse_json_response(raw, SimpleModel)
        assert result.name == "Dave"

    def test_json_with_embedded_quotes_in_name(self) -> None:
        """Regression test: names like "Gerry" that broke JSON parsing."""
        raw = '{"name": "Gerry", "age": 55}'
        result = _parse_json_response(raw, SimpleModel)
        assert result.name == "Gerry"

    def test_invalid_json_raises(self) -> None:
        raw = "This is not JSON at all."
        with pytest.raises(ValueError, match="invalid JSON"):
            _parse_json_response(raw, SimpleModel)
