from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import router

app = FastAPI(title="Garvesty", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.get("/", include_in_schema=False)
def root():
    """The Vite build uses the /NASA/ base path, matching GitHub Pages."""
    return RedirectResponse("/NASA/")


# When the frontend has been built, serve it from the same origin at /NASA/.
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/NASA", StaticFiles(directory=DIST, html=True), name="frontend")
