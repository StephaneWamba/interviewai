import asyncio
import difflib
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.websocket import manager

router = APIRouter(tags=["interview"])


def compute_diff_summary(old_code: str, new_code: str) -> str:
    if not old_code:
        lines = len(new_code.splitlines())
        return f"Candidate started writing code ({lines} lines)" if lines > 0 else ""

    old_lines = old_code.splitlines()
    new_lines = new_code.splitlines()
    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=0))

    if not diff:
        return ""

    added = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))

    if added > 0 and removed > 0:
        return f"Candidate modified code: +{added} lines, -{removed} lines"
    elif added > 0:
        return f"Candidate added {added} lines"
    elif removed > 0:
        return f"Candidate deleted {removed} lines"
    return ""


async def _keepalive(websocket: WebSocket, session_id: str):
    """Send a ping every 30s to prevent Fly.io proxy from dropping idle connections."""
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except Exception:
        pass


@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    session = await manager.connect(session_id, websocket)
    keepalive_task = asyncio.create_task(_keepalive(websocket, session_id))

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "code_change":
                await _handle_code_change(session, data)

            elif msg_type == "run_code":
                asyncio.create_task(_handle_run_code(session, data))

            elif msg_type == "agent_speaking":
                session.agent_is_speaking = data.get("speaking", False)
                if not session.agent_is_speaking and session.pending_context:
                    await _flush_pending_context(session)

            elif msg_type == "sync_request":
                async with session.code_lock:
                    session.last_code = data.get("content", "")
                await websocket.send_json({"type": "sync_ack"})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(session_id)
    finally:
        keepalive_task.cancel()


async def _handle_code_change(session, data: dict):
    async with session.code_lock:
        new_code = data.get("content", "")
        language = data.get("language", "python")

        if new_code == session.last_code:
            return

        diff_summary = compute_diff_summary(session.last_code, new_code)
        session.last_code = new_code
        session.current_language = language

        if not diff_summary:
            return

        context_msg = (
            f"[Code Update] {diff_summary}\n\n"
            f"Current code ({language}):\n```{language}\n{new_code}\n```"
        )

        if session.agent_is_speaking:
            session.pending_context.append(context_msg)
        else:
            await manager.send_to_candidate(session.session_id, {
                "type": "inject_context",
                "context": context_msg,
            })


async def _flush_pending_context(session):
    if session.pending_context:
        combined = "\n\n---\n\n".join(session.pending_context)
        session.pending_context.clear()
        await manager.send_to_candidate(session.session_id, {
            "type": "inject_context",
            "context": combined,
        })


async def _handle_run_code(session, data: dict):
    if not session.execution_semaphore._value:
        await manager.send_to_candidate(session.session_id, {
            "type": "error",
            "message": "Execution already in progress",
        })
        return

    async with session.execution_semaphore:
        code = data.get("content", "")
        language = data.get("language", "python")

        await manager.send_to_candidate(session.session_id, {
            "type": "execution_start",
        })

        from services.sandbox import execute_code
        result = await execute_code(code=code, language=language)

        await manager.send_to_candidate(session.session_id, {
            "type": "execution_result",
            "stdout": result.get("stdout", ""),
            "stderr": result.get("stderr", ""),
            "exit_code": result.get("exit_code", -1),
        })

        # Notify the voice agent of the result
        status = "passed" if result["exit_code"] == 0 else "failed with errors"
        result_context = (
            f"[Execution Result] The candidate ran their {language} code. "
            f"Status: {status}. "
            + (f"Output: {result['stdout'][:300]}" if result["stdout"] else "")
            + (f"Errors: {result['stderr'][:200]}" if result["stderr"] else "")
        )
        await manager.send_to_candidate(session.session_id, {
            "type": "inject_context",
            "context": result_context,
        })
