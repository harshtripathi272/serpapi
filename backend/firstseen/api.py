"""HTTP API for the web app: start a check, stream its progress over SSE, fetch the report.

    uvicorn firstseen.api:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from .models import CheckEvent, CheckReport
from .provenance import CheckError, CheckInput, run_check
from .serp import SerpClient, SerpError

MAX_IMAGE_BYTES = 15_000_000
EXAMPLES = json.loads((Path(__file__).parent / "examples.json").read_text(encoding="utf-8"))

app = FastAPI(title="First Seen")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("WEB_ORIGIN", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class _Check:
    events: list[CheckEvent] = field(default_factory=list)
    report: CheckReport | None = None
    done: bool = False
    task: asyncio.Task | None = None


_checks: dict[str, _Check] = {}
_client: SerpClient | None = None


def get_client() -> SerpClient:
    global _client
    if _client is None:
        _client = SerpClient()
    return _client


@app.get("/api/health")
def health() -> dict:
    client = get_client()
    return {"mode": client.mode, "credits_used": client.credits_used}


@app.get("/api/examples")
def examples() -> list[dict]:
    return EXAMPLES


@app.post("/api/checks")
async def start_check(
    file: UploadFile | None = File(default=None),
    image_url: str | None = Form(default=None),
    claim: str | None = Form(default=None),
) -> dict[str, str]:
    image = await file.read() if file else None
    if image and len(image) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is larger than 15 MB")
    if not image and not image_url:
        raise HTTPException(422, "Send an image file or an image_url")
    check_id = uuid.uuid4().hex[:12]
    state = _checks[check_id] = _Check()
    inp = CheckInput(image=image or None, image_url=(image_url or "").strip() or None, claim=(claim or "").strip() or None)
    state.task = asyncio.create_task(_run(check_id, inp, state))
    return {"check_id": check_id}


async def _run(check_id: str, inp: CheckInput, state: _Check) -> None:
    kind, message = "error", ""
    try:
        state.report = await run_check(inp, get_client(), state.events.append, check_id=check_id)
        kind, message = "done", state.report.verdict.headline
    except (CheckError, SerpError) as e:
        message = str(e)
    except Exception as e:  # report it to the UI instead of leaving the stream hanging
        message = f"internal error: {e!r}"
    credits = state.events[-1].credits_used if state.events else 0
    state.events.append(CheckEvent(seq=len(state.events), kind=kind, message=message, credits_used=credits))
    state.done = True


@app.get("/api/checks/{check_id}")
def get_check(check_id: str) -> CheckReport:
    state = _checks.get(check_id)
    if state is None:
        raise HTTPException(404, "unknown check")
    if state.report is None:
        raise HTTPException(409, "check failed" if state.done else "check still running")
    return state.report


@app.get("/api/checks/{check_id}/events")
async def check_events(check_id: str) -> StreamingResponse:
    state = _checks.get(check_id)
    if state is None:
        raise HTTPException(404, "unknown check")

    async def stream():
        sent = 0
        while True:
            while sent < len(state.events):
                yield f"data: {state.events[sent].model_dump_json()}\n\n"
                sent += 1
            if state.done:
                break
            await asyncio.sleep(0.2)

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
