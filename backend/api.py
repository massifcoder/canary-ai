"""FastAPI backend — SSE streaming for the Canary demo UI."""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from paypal_agent_toolkit.shared.paypal_client import PayPalClient
from paypal_agent_toolkit.shared.configuration import Context

from backend.agents.shopper import ShopperAgent
from backend.agents.guardian import GuardianAgent
from backend.agents.orchestrator import Orchestrator, SessionResult
from backend.safety.bypass_monitor import BypassMonitor
from backend.db.models import (
    init_db,
    get_all_transactions,
    get_all_merchants,
    get_bypass_attempts,
    get_dashboard_stats,
)

load_dotenv("cred.env")

sessions: dict[str, SessionResult] = {}
orchestrators: dict[str, Orchestrator] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Canary API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_orchestrator(canary_enabled: bool = True) -> tuple[str, Orchestrator]:
    paypal = PayPalClient(
        client_id=os.environ["BUSINESS_CLIENT_ID"],
        secret=os.environ["BUSINESS_SECRET_KEY"],
        context=Context(sandbox=True),
    )
    bypass_monitor = BypassMonitor()
    shopper = ShopperAgent(
        kernel_api_key=os.environ["ONKERNEL_API_KEY"],
        paypal_client=paypal,
    )
    guardian = GuardianAgent(
        channel3_api_key=os.environ["CHANNEL3_API_KEY"],
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        bypass_monitor=bypass_monitor,
    )
    session_id = str(uuid.uuid4())
    orch = Orchestrator(
        shopper=shopper,
        guardian=guardian,
        bypass_monitor=bypass_monitor,
        canary_enabled=canary_enabled,
    )
    return session_id, orch


@app.post("/api/purchase")
async def start_purchase(request: Request):
    """Start a purchase flow and stream events via SSE."""
    body = await request.json()
    query = body.get("query", "")
    sites = body.get("sites")
    canary_enabled = body.get("canary", True)

    session_id, orch = _build_orchestrator(canary_enabled)
    event_queue: asyncio.Queue = asyncio.Queue()

    def on_event(role: str, content: str, data: dict | None = None):
        event_queue.put_nowait({
            "role": role,
            "content": content,
            "data": data,
        })

    async def run_and_signal():
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, lambda: orch.run(query, sites, on_event)
        )
        sessions[session_id] = result
        orchestrators[session_id] = orch
        event_queue.put_nowait(None)  # sentinel

    async def event_stream():
        yield f"data: {json.dumps({'type': 'session_start', 'session_id': session_id})}\n\n"

        task = asyncio.create_task(run_and_signal())

        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield f"data: {json.dumps({'type': 'event', **event})}\n\n"

        result = sessions.get(session_id)
        summary = {
            "type": "session_end",
            "session_id": session_id,
            "verdict": result.final_verdict if result else "UNKNOWN",
            "order_id": result.order_id if result else None,
            "bypass_attempted": result.bypass_attempted if result else False,
        }
        if result and result.guardian_verdict:
            summary["trust_score"] = result.guardian_verdict.trust_report.trust_score
            summary["trust_breakdown"] = result.guardian_verdict.trust_report.breakdown
            if result.guardian_verdict.expectation_report:
                summary["expectation"] = result.guardian_verdict.expectation_report.to_dict()
        yield f"data: {json.dumps(summary)}\n\n"

        await task

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/consent/{session_id}")
async def user_consent(session_id: str, request: Request):
    """User approves or denies. If denied, streams fallback analysis via SSE."""
    body = await request.json()
    consented = body.get("consent", False)

    if session_id not in sessions:
        return {"error": "Session not found"}

    session = sessions[session_id]
    orch = orchestrators.get(session_id)
    if not orch:
        return {"error": "Orchestrator not found"}

    event_queue: asyncio.Queue = asyncio.Queue()

    def on_event(role: str, content: str, data: dict | None = None):
        event_queue.put_nowait({"role": role, "content": content, "data": data})

    async def run_consent():
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: orch.handle_user_consent(session, consented, on_event)
        )
        event_queue.put_nowait(None)

    async def event_stream():
        task = asyncio.create_task(run_consent())

        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield f"data: {json.dumps({'type': 'event', **event})}\n\n"

        result = sessions[session_id]
        summary = {
            "type": "session_end",
            "session_id": session_id,
            "verdict": result.final_verdict,
            "order_id": result.order_id,
            "bypass_attempted": result.bypass_attempted,
        }
        if result.guardian_verdict:
            summary["trust_score"] = result.guardian_verdict.trust_report.trust_score
            summary["trust_breakdown"] = result.guardian_verdict.trust_report.breakdown
            if result.guardian_verdict.expectation_report:
                summary["expectation"] = result.guardian_verdict.expectation_report.to_dict()
        yield f"data: {json.dumps(summary)}\n\n"

        await task

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# --- Dashboard endpoints ---

@app.get("/api/transactions")
async def list_transactions():
    return get_all_transactions()


@app.get("/api/merchants")
async def list_merchants():
    return get_all_merchants()


@app.get("/api/bypass-attempts")
async def list_bypass_attempts():
    return get_bypass_attempts()


@app.get("/api/stats")
async def dashboard_stats():
    return get_dashboard_stats()


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "canary"}
