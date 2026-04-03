import uuid
from datetime import datetime
from pydantic import BaseModel


class StartInterviewRequest(BaseModel):
    candidate_name: str
    job_role: str = "Développeur IA"
    resume_summary: str = ""
    interviewer_name: str = "Sophie"


class StartInterviewResponse(BaseModel):
    session_id: str
    signed_url: str
    dynamic_variables: dict


class ExecuteCodeRequest(BaseModel):
    session_id: str
    code: str
    language: str = "python"


class ExecuteCodeResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int


class EvaluationRequest(BaseModel):
    session_id: str
    problem_description: str = "Technical coding problem"


class EvaluationResult(BaseModel):
    overall_score: float
    technical_score: float
    code_quality_score: float
    time_complexity: str
    space_complexity: str
    strengths: list[str]
    improvements: list[str]
    voice_summary: str
    detailed_feedback: str
