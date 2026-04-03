# InterviewAI

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=flat&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Fly.io](https://img.shields.io/badge/Fly.io-8B5CF6?style=flat&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

AI-powered technical interview simulator with a voice agent, live code editor, and automated feedback report.

## About

InterviewAI lets candidates practice technical interviews with Sophie, an AI interviewer powered by ElevenLabs Conversational AI. Sophie speaks, listens, asks coding questions, watches the candidate's editor in real time, and delivers a structured performance report at the end.

Built to solve a real problem: technical interview anxiety is hard to address without realistic, high-pressure practice. Mock interviews with friends are inconsistent. Written prep tools are silent. InterviewAI gives a voice to the process.

## Features

- Voice conversation with a realistic AI interviewer (ElevenLabs WebSocket)
- Live Monaco code editor (VS Code engine) shared with the agent in real time
- Code execution sandbox (E2B) - Python, JavaScript, TypeScript
- Session-scoped conversation transcript
- Automated evaluation report with scores and feedback
- CV/resume parsing from PDF to pre-fill interview context
- Dark IDE-style UI

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, TypeScript, Monaco Editor, Framer Motion |
| Voice | ElevenLabs Conversational AI SDK (@elevenlabs/react) |
| Backend | FastAPI, Python 3.12, SQLAlchemy async |
| Database | Neon PostgreSQL (serverless) |
| Code Execution | E2B sandbox API |
| Frontend Deploy | Vercel |
| Backend Deploy | Fly.io |

## Architecture

```mermaid
graph TD
    User["Browser (Candidate)"]
    FE["Next.js Frontend\n(Vercel)"]
    BE["FastAPI Backend\n(Fly.io)"]
    DB["Neon PostgreSQL"]
    EL["ElevenLabs\nConversational AI"]
    E2B["E2B\nCode Sandbox"]

    User -->|HTTPS| FE
    FE -->|REST: start session| BE
    BE -->|get signed URL| EL
    BE -->|store session| DB
    FE -->|WebSocket: signedUrl| EL
    FE -->|WebSocket: code changes| BE
    BE -->|run code| E2B
    E2B -->|stdout/stderr| BE
    BE -->|execution result| FE
```

## Session Flow

```mermaid
sequenceDiagram
    participant U as Candidate
    participant FE as Frontend
    participant BE as Backend
    participant EL as ElevenLabs
    participant E2B as Sandbox

    U->>FE: Fill name + role + CV
    FE->>BE: POST /api/interview/start
    BE->>EL: GET /v1/convai/conversation/get-signed-url
    EL-->>BE: signed_url
    BE-->>FE: session_id + signed_url + dynamic_vars
    FE->>EL: startSession(signedUrl)
    EL-->>FE: onConnect
    EL->>U: Sophie speaks (greeting)
    U->>EL: Candidate speaks
    U->>FE: Types code in editor
    FE->>BE: WS code_change event
    BE->>EL: sendContextualUpdate(code)
    U->>FE: Run code
    FE->>BE: WS run_code event
    BE->>E2B: execute(code)
    E2B-->>BE: stdout/stderr
    BE-->>FE: execution_result
    U->>FE: End interview
    FE->>BE: POST /api/interview/evaluate
    BE-->>FE: score + feedback
    FE->>U: Report page
```

## Problem and Solution

**Problem:** ElevenLabs Conversational AI was disconnecting immediately after Sophie's greeting message in production.

Root causes found through deep investigation:

1. **SDK version bug** - `@elevenlabs/react` v1.0.1 crashed with `TypeError: Cannot read properties of undefined (reading 'error_type')` when receiving certain server messages. Fixed by upgrading to v1.0.2.

2. **Quota exceeded** - The ElevenLabs account hit its conversation quota limit during testing, causing `closeCode: 1002` with message `"This request exceeds your quota limit."`. The `onDisconnect` callback was not logging the disconnect reason, masking this.

3. **Agent turn timeout** - The agent was configured with `turn_timeout: 7` seconds. ElevenLabs closes the session if no audio is detected within 7 seconds of Sophie finishing. Updated to 30 seconds via the Agents API.

4. **Unstable React props** - `dynamicVariables` was passed directly from state, creating a new object reference on every parent re-render. Added `useMemo` with deep equality to keep the reference stable across re-renders.

5. **Stale connection pool** - Two Fly.io machines were sharing a SQLAlchemy async connection pool. Connections went stale between requests. Fixed with `pool_pre_ping=True` and `pool_recycle=300`.

## Local Setup

```bash
# Backend
cd backend
cp ../.env.example .env  # fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL
npm install
npm run dev
```

**Required environment variables:**

```
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
DATABASE_URL=
E2B_API_KEY=
```

## Deploy

- **Backend**: `flyctl deploy --app interviewai-api`
- **Frontend**: `vercel deploy --prod` from `frontend/`

## Live Demo

[interviewai.stephanewamba.com](https://interviewai.stephanewamba.com)
