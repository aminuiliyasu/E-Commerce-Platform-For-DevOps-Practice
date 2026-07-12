"""In-memory scan sessions — credentials never written to disk."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from scanner.credentials import AwsCredentials


@dataclass
class ScanSession:
    session_id: str
    credentials: AwsCredentials
    created_at: float = field(default_factory=time.time)
    cache: dict | None = None

    def is_expired(self, ttl_seconds: int = 3600) -> bool:
        return time.time() - self.created_at > ttl_seconds


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ScanSession] = {}

    def create(self, credentials: AwsCredentials) -> ScanSession:
        self._purge_expired()
        session = ScanSession(session_id=str(uuid.uuid4()), credentials=credentials)
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> ScanSession | None:
        self._purge_expired()
        session = self._sessions.get(session_id)
        if session and session.is_expired():
            self.delete(session_id)
            return None
        return session

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def _purge_expired(self) -> None:
        expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired:
            self.delete(sid)


sessions = SessionStore()
