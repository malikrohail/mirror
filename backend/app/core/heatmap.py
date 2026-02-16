"""Heatmap generator — aggregates click data and renders overlay PNGs."""

from __future__ import annotations

import io
import logging
import math
from dataclasses import dataclass, field
from typing import Any

from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger(__name__)

# Heatmap rendering parameters
HEATMAP_WIDTH = 1920
HEATMAP_HEIGHT = 1080
DOT_RADIUS = 30
BLUR_RADIUS = 25
OPACITY = 160  # 0-255


@dataclass
class ClickPoint:
    """A single click data point."""

    x: int
    y: int
    page_url: str
    persona_name: str


@dataclass
class HeatmapData:
    """Aggregated heatmap data for a page."""

    page_url: str
    clicks: list[ClickPoint] = field(default_factory=list)
    total_clicks: int = 0
    viewport_width: int = HEATMAP_WIDTH
    viewport_height: int = HEATMAP_HEIGHT


class HeatmapGenerator:
    """Generates click heatmap overlays from aggregated step data."""

    def aggregate_clicks(
        self,
        steps: list[dict[str, Any]],
    ) -> dict[str, HeatmapData]:
        """Aggregate click data from steps, grouped by page URL.

        Args:
            steps: List of step dicts with click_x, click_y, page_url, etc.

        Returns:
            Dict mapping page_url → HeatmapData.
        """
        pages: dict[str, HeatmapData] = {}

        for step in steps:
            page_url = step.get("page_url", "")
            click_x = step.get("click_x")
            click_y = step.get("click_y")

            if click_x is None or click_y is None:
                continue
            if step.get("action_type") != "click":
                continue

            if page_url not in pages:
                pages[page_url] = HeatmapData(
                    page_url=page_url,
                    viewport_width=step.get("viewport_width", HEATMAP_WIDTH),
                    viewport_height=step.get("viewport_height", HEATMAP_HEIGHT),
                )

            heatmap = pages[page_url]
            heatmap.clicks.append(ClickPoint(
                x=int(click_x),
                y=int(click_y),
                page_url=page_url,
                persona_name=step.get("persona_name", "Unknown"),
            ))
            heatmap.total_clicks += 1

        logger.info(
            "Aggregated clicks: %d pages, %d total clicks",
            len(pages),
            sum(h.total_clicks for h in pages.values()),
        )
        return pages

    def render_heatmap(
        self,
        heatmap_data: HeatmapData,
        width: int | None = None,
        height: int | None = None,
    ) -> bytes:
        """Render a heatmap overlay PNG from click data.

        Returns a semi-transparent PNG that can be overlaid on a screenshot.
        Uses gaussian blur on colored dots to create the heat effect.
        """
        w = width or heatmap_data.viewport_width
        h = height or heatmap_data.viewport_height

        if not heatmap_data.clicks:
            # Return a transparent image if no clicks
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            return self._image_to_bytes(img)

        # Create the heat layer (grayscale intensity)
        heat = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(heat)

        # Draw intensity dots at each click point
        max_intensity = 255
        for click in heatmap_data.clicks:
            # Normalize coordinates to target dimensions
            nx = int(click.x * w / heatmap_data.viewport_width)
            ny = int(click.y * h / heatmap_data.viewport_height)
            draw.ellipse(
                [nx - DOT_RADIUS, ny - DOT_RADIUS, nx + DOT_RADIUS, ny + DOT_RADIUS],
                fill=max_intensity,
            )

        # Apply gaussian blur for smooth heat effect
        heat = heat.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))

        # Colorize: map grayscale intensity to a warm color gradient
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        heat_pixels = heat.load()
        overlay_pixels = overlay.load()

        if heat_pixels is not None and overlay_pixels is not None:
            for y_px in range(h):
                for x_px in range(w):
                    intensity = heat_pixels[x_px, y_px]
                    if intensity > 5:  # Skip near-zero values
                        r, g, b = self._intensity_to_color(intensity / 255.0)
                        alpha = min(int(intensity * OPACITY / 255), 255)
                        overlay_pixels[x_px, y_px] = (r, g, b, alpha)

        return self._image_to_bytes(overlay)

    def render_heatmap_on_screenshot(
        self,
        screenshot: bytes,
        heatmap_data: HeatmapData,
    ) -> bytes:
        """Render heatmap overlay composited on top of a screenshot."""
        base = Image.open(io.BytesIO(screenshot)).convert("RGBA")
        heatmap_overlay_bytes = self.render_heatmap(
            heatmap_data, width=base.width, height=base.height
        )
        heatmap_overlay = Image.open(io.BytesIO(heatmap_overlay_bytes)).convert("RGBA")

        composite = Image.alpha_composite(base, heatmap_overlay)
        return self._image_to_bytes(composite)

    @staticmethod
    def _intensity_to_color(t: float) -> tuple[int, int, int]:
        """Map intensity (0-1) to a warm color gradient.

        0.0 = blue (cold) → 0.5 = yellow → 1.0 = red (hot)
        """
        if t < 0.25:
            # Blue to cyan
            r = 0
            g = int(255 * (t / 0.25))
            b = 255
        elif t < 0.5:
            # Cyan to green/yellow
            r = int(255 * ((t - 0.25) / 0.25))
            g = 255
            b = int(255 * (1 - (t - 0.25) / 0.25))
        elif t < 0.75:
            # Yellow to orange
            r = 255
            g = int(255 * (1 - (t - 0.5) / 0.25))
            b = 0
        else:
            # Orange to red
            r = 255
            g = int(max(0, 100 * (1 - (t - 0.75) / 0.25)))
            b = 0

        return (min(r, 255), min(g, 255), min(b, 255))

    def aggregate_clicks_by_persona(
        self,
        steps: list[dict[str, Any]],
    ) -> dict[str, dict[str, HeatmapData]]:
        """Aggregate click data grouped by persona, then by page URL.

        Returns:
            Dict mapping persona_name → {page_url → HeatmapData}.
        """
        persona_pages: dict[str, dict[str, HeatmapData]] = {}

        for step in steps:
            page_url = step.get("page_url", "")
            click_x = step.get("click_x")
            click_y = step.get("click_y")
            persona_name = step.get("persona_name", "Unknown")

            if click_x is None or click_y is None:
                continue
            if step.get("action_type") != "click":
                continue

            if persona_name not in persona_pages:
                persona_pages[persona_name] = {}

            pages = persona_pages[persona_name]
            if page_url not in pages:
                pages[page_url] = HeatmapData(
                    page_url=page_url,
                    viewport_width=step.get("viewport_width", HEATMAP_WIDTH),
                    viewport_height=step.get("viewport_height", HEATMAP_HEIGHT),
                )

            heatmap = pages[page_url]
            heatmap.clicks.append(ClickPoint(
                x=int(click_x),
                y=int(click_y),
                page_url=page_url,
                persona_name=persona_name,
            ))
            heatmap.total_clicks += 1

        logger.info(
            "Aggregated clicks by persona: %d personas, %d total clicks",
            len(persona_pages),
            sum(
                h.total_clicks
                for pages in persona_pages.values()
                for h in pages.values()
            ),
        )
        return persona_pages

    @staticmethod
    def _image_to_bytes(img: Image.Image) -> bytes:
        """Convert PIL Image to PNG bytes."""
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
