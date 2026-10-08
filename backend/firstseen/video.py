"""Keyframes from a forwarded video, one per scene, so each scene's footage can be dated.

Most WhatsApp forwards are videos: real footage, or slideshows of old photos. Lens searches
images, so a video is checked frame by frame. We sample 2 frames a second, start a new
scene when the colour histogram changes sharply, skip black or flat frames, and keep the
sharpest frame of each of the longest scenes.
"""
from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass

import cv2
import numpy as np

SAMPLE_FPS = 2.0
SCENE_CUT = 0.6  # colour histogram correlation below this suggests a new scene...
STRUCTURE_CUT = 0.7  # ...and the 32x32 grayscale layout must change too (codecs garble colours on some frames)
MIN_DETAIL = 12.0  # pixel standard deviation; below this a frame is black, a fade, or a title card
MAX_SIDE = 1280


@dataclass
class Keyframe:
    time_s: float
    scene_seconds: float
    jpeg: bytes


def is_video(data: bytes) -> bool:
    head = data[:16]
    return (head[4:8] == b"ftyp"  # mp4, mov, 3gp: what WhatsApp sends
            or head[:4] == b"\x1a\x45\xdf\xa3"  # webm, mkv
            or (head[:4] == b"RIFF" and head[8:12] == b"AVI "))


def _hist(frame: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten()


def _layout(frame: np.ndarray) -> np.ndarray:
    small = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (32, 32), interpolation=cv2.INTER_AREA)
    small = small.astype(np.float32)
    return (small - small.mean()) / (small.std() + 1e-6)


def _new_scene(scene: dict, hist: np.ndarray, layout: np.ndarray) -> bool:
    colour = cv2.compareHist(scene["hist"], hist, cv2.HISTCMP_CORREL)
    structure = float((scene["layout"] * layout).mean())
    return colour < SCENE_CUT and structure < STRUCTURE_CUT


def _sharpness(frame: np.ndarray) -> float:
    return float(cv2.Laplacian(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())


def _trim_borders(frame: np.ndarray, lit: int = 48) -> np.ndarray:
    """Cut letterbox and pillarbox bars. Phones pad photos with black to fit the video frame.

    A row or column is content if its brightest pixel is clearly lit. Averages don't work:
    a night photo (India on Diwali) averages darker than the threshold. Columns are measured
    only inside the kept rows, so tall bars don't dilute them.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    rows = np.where(gray.max(axis=1) > lit)[0]
    if rows.size == 0:
        return frame
    top, bottom = rows[0], rows[-1] + 1
    cols = np.where(gray[top:bottom].max(axis=0) > lit)[0]
    left, right = cols[0], cols[-1] + 1
    if (bottom - top) * (right - left) < 0.2 * gray.size:  # a tiny lit patch on black: keep the frame whole
        return frame
    return frame[top:bottom, left:right]


def _jpeg(frame: np.ndarray) -> bytes:
    h, w = frame.shape[:2]
    scale = min(1.0, MAX_SIDE / max(h, w))
    if scale < 1.0:
        frame = cv2.resize(frame, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise ValueError("couldn't encode a frame")
    return buf.tobytes()


def keyframes(data: bytes, max_frames: int = 3) -> list[Keyframe]:
    # OpenCV reads from a path, not from memory.
    fd, path = tempfile.mkstemp(suffix=".mp4")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            return []
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        step = max(1, round(fps / SAMPLE_FPS))
        scenes: list[dict] = []
        index = 0
        while True:
            ok = cap.grab()
            if not ok:
                break
            if index % step == 0:
                ok, frame = cap.retrieve()
                if ok:
                    frame = _trim_borders(frame)  # compare scenes on the picture, not on the black bars
                if ok and float(frame.std()) >= MIN_DETAIL:
                    t = index / fps
                    hist, layout = _hist(frame), _layout(frame)
                    if not scenes or _new_scene(scenes[-1], hist, layout):
                        scenes.append({"hist": hist, "layout": layout, "start": t, "end": t, "best": frame,
                                       "sharp": _sharpness(frame)})
                    else:
                        scene = scenes[-1]
                        scene["end"] = t
                        sharp = _sharpness(frame)
                        if sharp > scene["sharp"]:
                            scene["best"], scene["sharp"] = frame, sharp
            index += 1
        cap.release()
    finally:
        os.unlink(path)

    longest = sorted(scenes, key=lambda s: s["end"] - s["start"], reverse=True)[:max_frames]
    return [Keyframe(time_s=round(s["start"], 1), scene_seconds=round(s["end"] - s["start"] + 1 / SAMPLE_FPS, 1),
                     jpeg=_jpeg(s["best"]))
            for s in sorted(longest, key=lambda s: s["start"])]
