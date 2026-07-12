"""Serve built React app from FastAPI for production."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"


def mount_static(app: FastAPI) -> None:
    if not WEB_DIST.exists():
        return

    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/")
    def serve_index():
        from fastapi.responses import FileResponse
        return FileResponse(WEB_DIST / "index.html")

    @app.get("/{path:path}")
    def spa_fallback(path: str):
        from fastapi.responses import FileResponse
        file = WEB_DIST / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(WEB_DIST / "index.html")
