from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import router

app = FastAPI(title="Field Shift", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_error(_request, exc: RequestValidationError):
    # Raw invalid input can contain non-finite numbers that JSON cannot serialize.
    return JSONResponse(status_code=422, content={"detail": [
        {"type": err["type"], "loc": err["loc"], "msg": err["msg"]} for err in exc.errors()
    ]})


@app.get("/", include_in_schema=False)
def root():
    """The Vite build uses the /NASA/ base path, matching GitHub Pages."""
    return RedirectResponse("/NASA/")


# When the frontend has been built, serve it from the same origin at /NASA/.
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/NASA", StaticFiles(directory=DIST, html=True), name="frontend")
