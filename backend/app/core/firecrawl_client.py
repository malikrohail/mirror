"""Firecrawl integration — pre-crawl target sites before persona navigation.

Discovers pages, extracts content, builds a sitemap graph, and identifies
key pages (signup, login, pricing, etc.) to give the navigation engine
a "map" of the target site.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1"
MAX_PAGES = 50


class PageInfo(BaseModel):
    """Information about a single crawled page."""

    url: str
    title: str = ""
    description: str = ""
    headings: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    page_type: str = ""  # e.g., "landing", "signup", "pricing", "login", "docs"


class SiteMap(BaseModel):
    """Complete sitemap of a crawled site."""

    base_url: str
    pages: list[PageInfo] = Field(default_factory=list)
    total_pages: int = 0
    key_pages: dict[str, str] = Field(default_factory=dict)  # type → URL

    def to_navigation_context(self) -> str:
        """Format sitemap for injection into navigation prompts."""
        if not self.pages:
            return "No sitemap data available."

        lines = [f"SITE MAP ({self.total_pages} pages discovered):"]

        if self.key_pages:
            lines.append("\nKEY PAGES:")
            for page_type, url in self.key_pages.items():
                lines.append(f"  - {page_type}: {url}")

        lines.append("\nALL PAGES:")
        for page in self.pages[:30]:  # Limit to stay within token budget
            title_part = f' — "{page.title}"' if page.title else ""
            type_part = f" [{page.page_type}]" if page.page_type else ""
            lines.append(f"  - {page.url}{title_part}{type_part}")

        return "\n".join(lines)


class FirecrawlClient:
    """Client for the Firecrawl API for site pre-crawling."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("FIRECRAWL_API_KEY", "")
        self._client = httpx.AsyncClient(timeout=60.0)

    @property
    def is_configured(self) -> bool:
        """Check if Firecrawl API key is configured."""
        return bool(self._api_key)

    async def crawl_site(self, url: str, max_pages: int = MAX_PAGES) -> SiteMap:
        """Pre-crawl a site to discover pages, links, and content.

        Args:
            url: The base URL to crawl.
            max_pages: Maximum number of pages to discover.

        Returns:
            SiteMap with discovered pages and key page identification.
        """
        if not self.is_configured:
            logger.warning("Firecrawl API key not configured, returning empty sitemap")
            return SiteMap(base_url=url, total_pages=0)

        try:
            # Start a crawl job
            response = await self._client.post(
                f"{FIRECRAWL_API_URL}/crawl",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "url": url,
                    "limit": max_pages,
                    "scrapeOptions": {
                        "formats": ["markdown"],
                        "onlyMainContent": True,
                    },
                },
            )
            response.raise_for_status()
            crawl_data = response.json()

            # Poll for completion if async
            if crawl_data.get("id"):
                crawl_data = await self._poll_crawl(crawl_data["id"])

            return self._parse_crawl_result(url, crawl_data)

        except httpx.HTTPStatusError as e:
            logger.error("Firecrawl API error: %s %s", e.response.status_code, e.response.text)
            return SiteMap(base_url=url, total_pages=0)
        except Exception as e:
            logger.error("Firecrawl crawl failed: %s", e)
            return SiteMap(base_url=url, total_pages=0)

    async def get_page_content(self, url: str) -> PageInfo:
        """Extract clean text content from a single page."""
        if not self.is_configured:
            return PageInfo(url=url)

        try:
            response = await self._client.post(
                f"{FIRECRAWL_API_URL}/scrape",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "url": url,
                    "formats": ["markdown"],
                    "onlyMainContent": True,
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})

            metadata = data.get("metadata", {})
            return PageInfo(
                url=url,
                title=metadata.get("title", ""),
                description=metadata.get("description", ""),
            )
        except Exception as e:
            logger.error("Firecrawl scrape failed for %s: %s", url, e)
            return PageInfo(url=url)

    async def _poll_crawl(self, crawl_id: str, max_attempts: int = 30) -> dict[str, Any]:
        """Poll crawl job until completion."""
        import asyncio

        for _ in range(max_attempts):
            await asyncio.sleep(2)
            response = await self._client.get(
                f"{FIRECRAWL_API_URL}/crawl/{crawl_id}",
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "completed":
                return data
            if data.get("status") == "failed":
                logger.error("Firecrawl crawl failed: %s", data)
                return data

        logger.warning("Firecrawl crawl timed out after polling")
        return {}

    def _parse_crawl_result(self, base_url: str, data: dict[str, Any]) -> SiteMap:
        """Parse Firecrawl response into our SiteMap model."""
        pages: list[PageInfo] = []
        key_pages: dict[str, str] = {}

        crawled_pages = data.get("data", [])
        if isinstance(crawled_pages, list):
            for item in crawled_pages:
                metadata = item.get("metadata", {})
                page_url = metadata.get("sourceURL", "") or metadata.get("url", "")
                title = metadata.get("title", "")

                page_info = PageInfo(
                    url=page_url,
                    title=title,
                    description=metadata.get("description", ""),
                )

                # Classify page type by URL patterns
                page_info.page_type = self._classify_page(page_url, title)
                if page_info.page_type and page_info.page_type not in key_pages:
                    key_pages[page_info.page_type] = page_url

                pages.append(page_info)

        return SiteMap(
            base_url=base_url,
            pages=pages,
            total_pages=len(pages),
            key_pages=key_pages,
        )

    @staticmethod
    def _classify_page(url: str, title: str) -> str:
        """Classify a page by its URL and title patterns."""
        url_lower = url.lower()
        title_lower = title.lower()

        patterns = {
            "signup": ["signup", "sign-up", "register", "create-account"],
            "login": ["login", "log-in", "signin", "sign-in"],
            "pricing": ["pricing", "plans", "billing"],
            "landing": ["home", "landing"],
            "docs": ["docs", "documentation", "help", "guide"],
            "about": ["about", "team", "company"],
            "contact": ["contact", "support"],
            "blog": ["blog", "articles", "posts"],
            "settings": ["settings", "account", "profile"],
            "dashboard": ["dashboard", "app", "console"],
        }

        for page_type, keywords in patterns.items():
            for kw in keywords:
                if kw in url_lower or kw in title_lower:
                    return page_type

        return ""

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
