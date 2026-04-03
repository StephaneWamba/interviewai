import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_role: Mapped[str] = mapped_column(String(255), nullable=True)
    interviewer_name: Mapped[str] = mapped_column(String(100), default="Sophie")
    resume_summary: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    ended_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    transcripts: Mapped[list["TranscriptEntry"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    code_snapshots: Mapped[list["CodeSnapshot"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    evaluation: Mapped["EvaluationReport"] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")


class TranscriptEntry(Base):
    __tablename__ = "transcript_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"))
    speaker: Mapped[str] = mapped_column(String(20))  # "interviewer" | "candidate"
    content: Mapped[str] = mapped_column(Text)
    sequence_num: Mapped[int] = mapped_column(Integer)
    spoken_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    session: Mapped["InterviewSession"] = relationship(back_populates="transcripts")


class CodeSnapshot(Base):
    __tablename__ = "code_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"))
    language: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    snapshot_type: Mapped[str] = mapped_column(String(20))  # "auto" | "manual" | "final"
    execution_result: Mapped[dict] = mapped_column(JSONB, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    session: Mapped["InterviewSession"] = relationship(back_populates="code_snapshots")


class EvaluationReport(Base):
    __tablename__ = "evaluation_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True)
    technical_score: Mapped[float] = mapped_column(Float, nullable=True)
    communication_score: Mapped[float] = mapped_column(Float, nullable=True)
    code_quality_score: Mapped[float] = mapped_column(Float, nullable=True)
    strengths: Mapped[list] = mapped_column(ARRAY(Text), nullable=True)
    weaknesses: Mapped[list] = mapped_column(ARRAY(Text), nullable=True)
    detailed_feedback: Mapped[str] = mapped_column(Text, nullable=True)
    voice_summary: Mapped[str] = mapped_column(Text, nullable=True)
    raw_llm_response: Mapped[dict] = mapped_column(JSONB, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    session: Mapped["InterviewSession"] = relationship(back_populates="evaluation")
