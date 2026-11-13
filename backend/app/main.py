import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import db
from .routes import router

# Statically exported frontend; absent in local backend-only runs.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(router)

# Mounted last so /api routes take precedence.
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
