import uuid
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from models.schemas import EvaluationRequest, EvaluationResult
from models.session import EvaluationReport, CodeSnapshot
from core.websocket import manager
from core.database import get_db

router = APIRouter(prefix="/api", tags=["evaluation"])


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate_code(req: EvaluationRequest, db: AsyncSession = Depends(get_db)):
    """
    Evaluate candidate code using Claude directly (Agent SDK is too slow for real-time).
    Called by the candidate clicking 'Evaluate' or by ElevenLabs server tool webhook.
    """
    session = manager.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    code = session.last_code
    language = session.current_language

    if not code.strip():
        raise HTTPException(status_code=400, detail="No code to evaluate")

    # Use Claude API directly for speed (not Agent SDK)
    import anthropic
    from core.config import settings

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are evaluating a technical interview code submission.

PROBLEM: {req.problem_description}

LANGUAGE: {language}

CODE:
```{language}
{code}
```

Evaluate and return ONLY a JSON object with this exact structure:
{{
  "overall_score": <float 0-10>,
  "technical_score": <float 0-10>,
  "code_quality_score": <float 0-10>,
  "time_complexity": "<O(n) notation>",
  "space_complexity": "<O(n) notation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "voice_summary": "<one natural French sentence an interviewer would say>",
  "detailed_feedback": "<2-3 sentences of detailed technical feedback in French>"
}}

Return ONLY the JSON, no other text."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    result_text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if result_text.startswith("```"):
        result_text = result_text.split("```")[1]
        if result_text.startswith("json"):
            result_text = result_text[4:]

    result_data = json.loads(result_text)
    evaluation = EvaluationResult(**result_data)

    # Save to DB
    snapshot = CodeSnapshot(
        session_id=uuid.UUID(req.session_id),
        language=language,
        content=code,
        snapshot_type="final",
    )
    db.add(snapshot)

    report = EvaluationReport(
        session_id=uuid.UUID(req.session_id),
        technical_score=evaluation.technical_score,
        code_quality_score=evaluation.code_quality_score,
        strengths=evaluation.strengths,
        weaknesses=evaluation.improvements,
        detailed_feedback=evaluation.detailed_feedback,
        voice_summary=evaluation.voice_summary,
        raw_llm_response=result_data,
    )
    db.add(report)
    await db.commit()

    # Send to candidate UI
    await manager.send_to_candidate(req.session_id, {
        "type": "evaluation_result",
        "evaluation": evaluation.model_dump(),
    })

    # Return voice_summary for ElevenLabs server tool response
    return evaluation


@router.get("/report/{session_id}")
async def get_report(session_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(EvaluationReport).where(
            EvaluationReport.session_id == uuid.UUID(session_id)
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
