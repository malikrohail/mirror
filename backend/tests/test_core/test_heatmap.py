"""Tests for heatmap generation."""

from __future__ import annotations

import io
from typing import Any

import pytest
from PIL import Image

from app.core.heatmap import ClickPoint, HeatmapData, HeatmapGenerator


class TestHeatmapAggregation:
    """Test click data aggregation."""

    @pytest.fixture
    def generator(self) -> HeatmapGenerator:
        return HeatmapGenerator()

    def test_aggregate_clicks_groups_by_page(self, generator: HeatmapGenerator) -> None:
        steps = [
            {"page_url": "/a", "action_type": "click", "click_x": 100, "click_y": 200, "viewport_width": 1920, "viewport_height": 1080},
            {"page_url": "/a", "action_type": "click", "click_x": 150, "click_y": 250, "viewport_width": 1920, "viewport_height": 1080},
            {"page_url": "/b", "action_type": "click", "click_x": 300, "click_y": 400, "viewport_width": 1920, "viewport_height": 1080},
        ]
        result = generator.aggregate_clicks(steps)
        assert len(result) == 2
        assert result["/a"].total_clicks == 2
        assert result["/b"].total_clicks == 1

    def test_aggregate_clicks_ignores_non_click_actions(self, generator: HeatmapGenerator) -> None:
        steps = [
            {"page_url": "/a", "action_type": "scroll", "click_x": 100, "click_y": 200},
            {"page_url": "/a", "action_type": "type", "click_x": 100, "click_y": 200},
            {"page_url": "/a", "action_type": "click", "click_x": 100, "click_y": 200, "viewport_width": 1920, "viewport_height": 1080},
        ]
        result = generator.aggregate_clicks(steps)
        assert result["/a"].total_clicks == 1

    def test_aggregate_clicks_ignores_missing_coordinates(self, generator: HeatmapGenerator) -> None:
        steps = [
            {"page_url": "/a", "action_type": "click", "click_x": None, "click_y": None},
            {"page_url": "/a", "action_type": "click", "click_x": 100, "click_y": None},
            {"page_url": "/a", "action_type": "click", "click_x": 100, "click_y": 200, "viewport_width": 1920, "viewport_height": 1080},
        ]
        result = generator.aggregate_clicks(steps)
        assert result["/a"].total_clicks == 1

    def test_aggregate_clicks_empty_input(self, generator: HeatmapGenerator) -> None:
        result = generator.aggregate_clicks([])
        assert len(result) == 0

    def test_click_point_stores_persona(self, generator: HeatmapGenerator) -> None:
        steps = [
            {"page_url": "/a", "action_type": "click", "click_x": 100, "click_y": 200, "persona_name": "Maria", "viewport_width": 1920, "viewport_height": 1080},
        ]
        result = generator.aggregate_clicks(steps)
        assert result["/a"].clicks[0].persona_name == "Maria"


class TestHeatmapRendering:
    """Test heatmap image rendering."""

    @pytest.fixture
    def generator(self) -> HeatmapGenerator:
        return HeatmapGenerator()

    def test_render_empty_heatmap_returns_transparent_png(self, generator: HeatmapGenerator) -> None:
        data = HeatmapData(page_url="/test", clicks=[], viewport_width=200, viewport_height=100)
        result = generator.render_heatmap(data, width=200, height=100)
        assert isinstance(result, bytes)
        # Should be a valid PNG
        img = Image.open(io.BytesIO(result))
        assert img.size == (200, 100)
        assert img.mode == "RGBA"

    def test_render_heatmap_with_clicks(self, generator: HeatmapGenerator) -> None:
        clicks = [
            ClickPoint(x=50, y=50, page_url="/test", persona_name="A"),
            ClickPoint(x=55, y=55, page_url="/test", persona_name="B"),
            ClickPoint(x=150, y=80, page_url="/test", persona_name="A"),
        ]
        data = HeatmapData(
            page_url="/test",
            clicks=clicks,
            total_clicks=3,
            viewport_width=200,
            viewport_height=100,
        )
        result = generator.render_heatmap(data, width=200, height=100)
        assert isinstance(result, bytes)
        img = Image.open(io.BytesIO(result))
        assert img.size == (200, 100)
        # Should have some non-transparent pixels (the heat dots)
        pixels = list(img.tobytes())  # raw RGBA bytes
        # Check RGBA bytes — every 4th byte is alpha; at least some should be > 0
        alpha_bytes = pixels[3::4]
        assert any(a > 0 for a in alpha_bytes)

    def test_render_with_custom_dimensions(self, generator: HeatmapGenerator) -> None:
        clicks = [ClickPoint(x=100, y=100, page_url="/test", persona_name="A")]
        data = HeatmapData(
            page_url="/test",
            clicks=clicks,
            total_clicks=1,
            viewport_width=1920,
            viewport_height=1080,
        )
        result = generator.render_heatmap(data, width=400, height=300)
        img = Image.open(io.BytesIO(result))
        assert img.size == (400, 300)


class TestIntensityToColor:
    """Test the color gradient mapping."""

    def test_cold_is_blue(self) -> None:
        r, g, b = HeatmapGenerator._intensity_to_color(0.0)
        assert b == 255
        assert r == 0

    def test_hot_is_red(self) -> None:
        r, g, b = HeatmapGenerator._intensity_to_color(1.0)
        assert r == 255
        assert b == 0

    def test_mid_is_yellow_or_green(self) -> None:
        r, g, b = HeatmapGenerator._intensity_to_color(0.5)
        assert r > 0
        assert g > 0

    def test_all_values_in_range(self) -> None:
        for i in range(101):
            t = i / 100.0
            r, g, b = HeatmapGenerator._intensity_to_color(t)
            assert 0 <= r <= 255
            assert 0 <= g <= 255
            assert 0 <= b <= 255
