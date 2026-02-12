"""Reverse proxy that strips anti-framing headers so any site can be embedded in an iframe."""

import ipaddress
import socket
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import Response

router = APIRouter()

MAX_RESPONSE_BYTES = 10 * 1024 * 1024  # 10 MB
FETCH_TIMEOUT = 15.0

# Headers that prevent iframe embedding
STRIP_HEADERS = {
    "x-frame-options",
    "content-security-policy",
    "content-security-policy-report-only",
}

# Hop-by-hop / transfer headers that must not be forwarded
HOP_BY_HOP_HEADERS = {
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
}


def _is_private_ip(hostname: str) -> bool:
    """Resolve hostname and check if any address is private/reserved (SSRF protection)."""
    try:
        infos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror:
        return True  # can't resolve → block

    for _, _, _, _, sockaddr in infos:
        addr = ipaddress.ip_address(sockaddr[0])
        if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
            return True
    return False


@router.get("")
async def proxy_url(url: str = Query(..., description="URL to proxy")) -> Response:
    """Fetch a URL and return its content with anti-framing headers stripped."""
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        return Response(content="Only http/https URLs are allowed", status_code=400)

    if not parsed.hostname:
        return Response(content="Invalid URL", status_code=400)

    if _is_private_ip(parsed.hostname):
        return Response(content="Private/reserved addresses are not allowed", status_code=403)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=FETCH_TIMEOUT,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        ) as client:
            resp = await client.get(url)
    except httpx.TimeoutException:
        return Response(content="Upstream request timed out", status_code=504)
    except httpx.RequestError as exc:
        return Response(content=f"Failed to fetch URL: {exc}", status_code=502)

    body = resp.content
    if len(body) > MAX_RESPONSE_BYTES:
        return Response(content="Response too large", status_code=502)

    content_type = resp.headers.get("content-type", "")

    # For HTML responses, inject a <base> tag so relative URLs resolve correctly
    if "text/html" in content_type:
        body_str = body.decode("utf-8", errors="replace")
        base_tag = f'<base href="{url}">'
        if "<head>" in body_str:
            body_str = body_str.replace("<head>", f"<head>{base_tag}", 1)
        elif "<head " in body_str:
            # <head with attributes
            idx = body_str.index("<head ")
            close = body_str.index(">", idx)
            body_str = body_str[: close + 1] + base_tag + body_str[close + 1 :]
        elif "<HEAD>" in body_str:
            body_str = body_str.replace("<HEAD>", f"<HEAD>{base_tag}", 1)
        else:
            # No <head> tag found — prepend
            body_str = base_tag + body_str
        body = body_str.encode("utf-8")

    # Build response headers, stripping anti-framing and hop-by-hop headers
    headers: dict[str, str] = {}
    for key, value in resp.headers.items():
        lower = key.lower()
        if lower in STRIP_HEADERS or lower in HOP_BY_HOP_HEADERS:
            continue
        headers[key] = value

    return Response(content=body, status_code=resp.status_code, headers=headers)
