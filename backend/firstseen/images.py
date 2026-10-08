"""Image bytes: download, hash, and shrink to the Image API's 500 KB limit."""
from __future__ import annotations

import hashlib
import io

import requests

MAX_UPLOAD_BYTES = 500_000


def sha256(image: bytes) -> str:
    return hashlib.sha256(image).hexdigest()


def download(url: str, timeout: float = 30) -> bytes | None:
    # requests ships its own CA bundle; urllib on Windows trips over expired certs in the system store.
    try:
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=timeout)
        resp.raise_for_status()
        return resp.content
    except requests.RequestException:
        return None


def shrink(image: bytes, limit: int = MAX_UPLOAD_BYTES) -> bytes | None:
    """JPEG-recompress until under limit. Returns None if Pillow can't read it or it won't fit."""
    if len(image) <= limit:
        return image
    from PIL import Image, UnidentifiedImageError

    try:
        img = Image.open(io.BytesIO(image)).convert("RGB")
    except UnidentifiedImageError:
        return None
    img.thumbnail((1600, 1600))
    for quality in (85, 75, 60, 45):
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=quality)
        if out.tell() <= limit:
            return out.getvalue()
    return None
