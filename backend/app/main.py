import uuid
import asyncio
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, Request, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, OperationalError
from .config import settings
from .database import SessionLocal
from .logging.json_logger import get_logger
from .metrics import record_request, render_metrics, METRICS_CONTENT_TYPE
from .services.brand_service import ensure_brands
from .auth.security import hash_password
from .models import User
from .api import ideas, tasks, logs, ai, summary, auth, system
from .services.filesystem_sync import run_filesystem_sync

logger = get_logger("api")

app = FastAPI(title="43v3r AI OS")

# Simple in-memory rate limiter (dev only)
RATE_LIMITS = {
    "/ideas": 30,
    "/auth/login": 10,
}
_rate_state: dict[str, dict[str, dict[str, datetime | int]]] = {}

allowed_origins = [settings.frontend_url] if settings.frontend_url else []
for fallback in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    if fallback not in allowed_origins:
        allowed_origins.append(fallback)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    path = request.url.path
    limit = RATE_LIMITS.get(path)
    if limit:
        window = timedelta(minutes=1)
        key = f"{ip}:{path}"
        state = _rate_state.get(key, {"count": 0, "reset": datetime.utcnow() + window})
        if datetime.utcnow() > state["reset"]:
            state = {"count": 0, "reset": datetime.utcnow() + window}
        state["count"] += 1
        _rate_state[key] = state
        if state["count"] > limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

    correlation_id = request.headers.get("x-correlation-id", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time
    logger.info(
        "request",
        extra={
            "extra": {
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
            }
        },
    )
    record_request(request.method, request.url.path, response.status_code, duration)
    response.headers["x-correlation-id"] = correlation_id
    return response


@app.on_event("startup")
def startup_seed():
    db: Session = SessionLocal()
    try:
        try:
            ensure_brands(db)
            existing = db.query(User).count()
            if not existing:
                user = User(username="admin", hashed_password=hash_password("admin"), role="admin")
                db.add(user)
                db.commit()
        except (ProgrammingError, OperationalError) as exc:
            logger.info(
                "startup_seed_skipped",
                extra={"extra": {"reason": "db_not_ready", "error": str(exc)}},
            )
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(ideas.router)
app.include_router(tasks.router)
app.include_router(logs.router)
app.include_router(ai.router)
app.include_router(ai.router, prefix="/api")
app.include_router(summary.router)
app.include_router(system.router)


@app.on_event("startup")
async def start_filesystem_sync_loop():
    interval = max(settings.fs_sync_interval_minutes, 1)

    async def loop():
        while True:
            db = SessionLocal()
            try:
                run_filesystem_sync(db)
            except Exception:
                pass
            finally:
                db.close()
            await asyncio.sleep(interval * 60)

    asyncio.create_task(loop())


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    db: Session = SessionLocal()
    try:
        payload = render_metrics(db)
    except Exception:
        payload = render_metrics(None)
    finally:
        db.close()
    return Response(content=payload, media_type=METRICS_CONTENT_TYPE)
