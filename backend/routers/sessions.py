import io
import re
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.session import InterviewSession
from models.schemas import StartInterviewRequest, StartInterviewResponse
from services.elevenlabs_service import get_signed_session_url
from core.database import get_db

router = APIRouter(prefix="/api", tags=["sessions"])


@router.post("/interview/start", response_model=StartInterviewResponse)
async def start_interview(req: StartInterviewRequest, db: AsyncSession = Depends(get_db)):
    """Create a session and return ElevenLabs signed URL for the browser."""
    # Create DB session record
    session = InterviewSession(
        candidate_name=req.candidate_name,
        job_role=req.job_role,
        resume_summary=req.resume_summary,
        interviewer_name=req.interviewer_name,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Get ElevenLabs signed URL (graceful fallback for demo without agent ID)
    try:
        token_data = await get_signed_session_url(
            candidate_name=req.candidate_name,
            job_role=req.job_role,
            resume_summary=req.resume_summary,
            interviewer_name=req.interviewer_name,
        )
    except ValueError:
        token_data = {"signed_url": "", "dynamic_variables": {}}

    return StartInterviewResponse(
        session_id=str(session.id),
        signed_url=token_data["signed_url"],
        dynamic_variables=token_data["dynamic_variables"],
    )


@router.post("/parse-cv")
async def parse_cv(file: UploadFile = File(...)):
    """Parse a PDF CV and return structured markdown text."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB).")

    try:
        import pdfplumber
        pages_text: list[str] = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
        raw = "\n\n".join(pages_text)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {e}")

    markdown = _raw_to_markdown(raw)
    return {"markdown": markdown}


def _raw_to_markdown(text: str) -> str:
    """Heuristic conversion of raw extracted PDF text to readable markdown."""
    lines = text.splitlines()
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            out.append("")
            continue
        # ALL CAPS short lines → section headings
        if stripped.isupper() and len(stripped) < 60 and not stripped[0].isdigit():
            out.append(f"\n## {stripped.title()}")
        # Lines starting with common bullet chars
        elif re.match(r"^[•·▪▸\-–—]\s", stripped):
            out.append(f"- {stripped[2:].strip()}")
        else:
            out.append(stripped)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


@router.get("/interview/{session_id}/reconnect")
async def reconnect_interview(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return a fresh ElevenLabs signed URL for an existing session (e.g. after network drop)."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    token_data = await get_signed_session_url(
        candidate_name=session.candidate_name,
        job_role=session.job_role,
        resume_summary=session.resume_summary or "",
        interviewer_name=session.interviewer_name,
    )
    return {"signed_url": token_data["signed_url"]}


@router.get("/interview/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
