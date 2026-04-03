import asyncio
from typing import Optional
from fastapi import WebSocket


class InterviewSessionState:
    """Hot state for an active interview session."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.candidate_ws: Optional[WebSocket] = None
        self.last_code: str = ""
        self.current_language: str = "python"
        self.code_lock = asyncio.Lock()
        self.execution_semaphore = asyncio.Semaphore(1)
        self.agent_is_speaking: bool = False
        self.pending_context: list[str] = []


class ConnectionManager:
    """Manages active WebSocket connections. Async-safe via asyncio primitives."""

    def __init__(self):
        self._sessions: dict[str, InterviewSessionState] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> InterviewSessionState:
        await websocket.accept()
        if session_id not in self._sessions:
            self._sessions[session_id] = InterviewSessionState(session_id)
        self._sessions[session_id].candidate_ws = websocket
        return self._sessions[session_id]

    async def disconnect(self, session_id: str):
        session = self._sessions.pop(session_id, None)
        if session and session.candidate_ws:
            try:
                await session.candidate_ws.close()
            except Exception:
                pass

    def get_session(self, session_id: str) -> Optional[InterviewSessionState]:
        return self._sessions.get(session_id)

    async def send_to_candidate(self, session_id: str, message: dict):
        session = self._sessions.get(session_id)
        if session and session.candidate_ws:
            try:
                await session.candidate_ws.send_json(message)
            except Exception:
                pass


# Global singleton — one per uvicorn worker process
manager = ConnectionManager()
