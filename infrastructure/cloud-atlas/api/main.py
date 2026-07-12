"""Cloud Atlas API — session-based AWS scanning, credentials never stored on disk."""

from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.sessions import ScanSession, sessions
from graph.awareness import AwarenessEngine
from graph.engine import GraphEngine
from scanner.aws_scanner import AwsScanner
from scanner.credentials import AwsCredentials, build_session, verify_credentials
from scanner.models import ScanSnapshot
from scanner.terraform import TerraformCorrelator, TerraformStateLoader

load_dotenv()

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5190,http://127.0.0.1:5190,https://awsvisualizer.aminuiliyasu.com",
).split(",")

app = FastAPI(title="Cloud Atlas", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectRequest(BaseModel):
    access_key_id: str
    secret_access_key: str
    session_token: str | None = None
    region: str = "eu-central-1"
    tf_state_bucket: str | None = None
    tf_state_key: str | None = None


def _run_scan(session: ScanSession) -> dict:
    creds = session.credentials
    boto = build_session(creds)
    snapshot = AwsScanner(credentials=creds, session=boto).scan()
    state = TerraformStateLoader(credentials=creds, session=boto).load()
    tf_report = TerraformCorrelator().correlate(snapshot, state)
    awareness = AwarenessEngine().analyze(snapshot, tf_report)
    data = {
        "snapshot": json.loads(snapshot.model_dump_json()),
        "terraform": tf_report,
        "awareness": awareness,
    }
    session.cache = data
    return data


def require_session(x_session_id: str | None = Header(default=None)) -> ScanSession:
    if not x_session_id:
        raise HTTPException(401, "Connect with AWS credentials first")
    session = sessions.get(x_session_id)
    if not session:
        raise HTTPException(401, "Session expired — connect again")
    return session


@app.get("/health")
def health():
    return {"status": "ok", "service": "cloud-atlas"}


@app.post("/connect")
def connect(body: ConnectRequest):
    creds = AwsCredentials(
        access_key_id=body.access_key_id.strip(),
        secret_access_key=body.secret_access_key.strip(),
        session_token=body.session_token.strip() if body.session_token else None,
        region=body.region,
        tf_state_bucket=body.tf_state_bucket,
        tf_state_key=body.tf_state_key,
        tf_state_region=body.region,
    )
    try:
        identity = verify_credentials(creds)
    except Exception as exc:
        raise HTTPException(401, f"Invalid AWS credentials: {exc}") from exc

    session = sessions.create(creds)
    try:
        data = _run_scan(session)
    except Exception as exc:
        sessions.delete(session.session_id)
        raise HTTPException(400, f"Scan failed: {exc}") from exc

    return {
        "session_id": session.session_id,
        "account_id": identity["account_id"],
        "arn": identity["arn"],
        "region": creds.region,
        "summary": data["awareness"]["summary"],
    }


@app.post("/disconnect")
def disconnect(session: ScanSession = Depends(require_session)):
    sessions.delete(session.session_id)
    return {"status": "disconnected"}


@app.post("/scan")
def run_scan(session: ScanSession = Depends(require_session)):
    session.cache = None
    data = _run_scan(session)
    return {"status": "scanned", "summary": data["awareness"]["summary"]}


def _data(session: ScanSession) -> dict:
    if not session.cache:
        session.cache = _run_scan(session)
    return session.cache


@app.get("/overview")
def overview(session: ScanSession = Depends(require_session)):
    data = _data(session)
    return {
        "summary": data["awareness"]["summary"],
        "questions": data["awareness"]["questions"],
        "alerts": data["awareness"]["alerts"][:20],
        "scanned_at": data["snapshot"]["scanned_at"],
        "account_id": data["snapshot"]["account_id"],
        "region": data["snapshot"]["region"],
    }


@app.get("/graph")
def graph(session: ScanSession = Depends(require_session)):
    data = _data(session)
    return {"nodes": data["snapshot"]["nodes"], "edges": data["snapshot"]["edges"]}


@app.get("/graph/by-type")
def graph_by_type(session: ScanSession = Depends(require_session)):
    snap = ScanSnapshot.model_validate(_data(session)["snapshot"])
    return GraphEngine(snap).nodes_by_type()


@app.get("/vpc/{vpc_id}")
def vpc_map(vpc_id: str, session: ScanSession = Depends(require_session)):
    snap = ScanSnapshot.model_validate(_data(session)["snapshot"])
    layout = GraphEngine(snap).vpc_layout(vpc_id)
    if not layout:
        raise HTTPException(404, "VPC not found")
    return layout


@app.get("/impact/{resource_id}")
def delete_impact(resource_id: str, session: ScanSession = Depends(require_session)):
    snap = ScanSnapshot.model_validate(_data(session)["snapshot"])
    return GraphEngine(snap).delete_impact(resource_id)


@app.get("/terraform")
def terraform_report(session: ScanSession = Depends(require_session)):
    return _data(session)["terraform"]


from api.static import mount_static
mount_static(app)


def main():
    import uvicorn
    port = int(os.getenv("API_PORT", "8090"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=reload)


if __name__ == "__main__":
    main()
