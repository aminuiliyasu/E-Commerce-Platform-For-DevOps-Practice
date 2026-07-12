"""Cloud Atlas API — serves graph, awareness cards, and map layouts."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from graph.awareness import AwarenessEngine
from graph.engine import GraphEngine
from scanner.aws_scanner import AwsScanner
from scanner.terraform import TerraformCorrelator, TerraformStateLoader

load_dotenv()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_FILE = DATA_DIR / "latest_scan.json"

app = FastAPI(title="Cloud Atlas", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5190", "http://127.0.0.1:5190"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict | None = None


def _load_or_scan() -> dict:
    global _cache
    if _cache:
        return _cache

    if CACHE_FILE.exists():
        _cache = json.loads(CACHE_FILE.read_text())
        return _cache

    snapshot = AwsScanner().scan()
    state = TerraformStateLoader().load()
    tf_report = TerraformCorrelator().correlate(snapshot, state)
    awareness = AwarenessEngine().analyze(snapshot, tf_report)

    _cache = {
        "snapshot": json.loads(snapshot.model_dump_json()),
        "terraform": tf_report,
        "awareness": awareness,
    }
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(_cache, indent=2))
    return _cache


@app.get("/health")
def health():
    return {"status": "ok", "service": "cloud-atlas"}


@app.post("/scan")
def run_scan():
    global _cache
    _cache = None
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()
    data = _load_or_scan()
    return {"status": "scanned", "summary": data["awareness"]["summary"]}


@app.get("/overview")
def overview():
    data = _load_or_scan()
    return {
        "summary": data["awareness"]["summary"],
        "questions": data["awareness"]["questions"],
        "alerts": data["awareness"]["alerts"][:20],
        "scanned_at": data["snapshot"]["scanned_at"],
        "account_id": data["snapshot"]["account_id"],
        "region": data["snapshot"]["region"],
    }


@app.get("/graph")
def graph():
    data = _load_or_scan()
    return {
        "nodes": data["snapshot"]["nodes"],
        "edges": data["snapshot"]["edges"],
    }


@app.get("/graph/by-type")
def graph_by_type():
    from scanner.models import ScanSnapshot
    snap = ScanSnapshot.model_validate(_load_or_scan()["snapshot"])
    return GraphEngine(snap).nodes_by_type()


@app.get("/vpc/{vpc_id}")
def vpc_map(vpc_id: str):
    from scanner.models import ScanSnapshot
    snap = ScanSnapshot.model_validate(_load_or_scan()["snapshot"])
    layout = GraphEngine(snap).vpc_layout(vpc_id)
    if not layout:
        raise HTTPException(404, "VPC not found")
    return layout


@app.get("/impact/{resource_id}")
def delete_impact(resource_id: str):
    from scanner.models import ScanSnapshot
    snap = ScanSnapshot.model_validate(_load_or_scan()["snapshot"])
    return GraphEngine(snap).delete_impact(resource_id)


@app.get("/terraform")
def terraform_report():
    data = _load_or_scan()
    return data["terraform"]


def main():
    import uvicorn
    port = int(os.getenv("API_PORT", "8090"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)


if __name__ == "__main__":
    main()
