import httpx
from core.config import settings


async def get_signed_session_url(
    candidate_name: str,
    job_role: str,
    resume_summary: str,
    interviewer_name: str = "Sophie",
) -> dict:
    """
    Returns a signed URL + dynamic variables for browser-side ElevenLabs session init.
    Uses WebSocket mode (get-signed-url). The API key is never exposed to the browser.
    """
    if not settings.elevenlabs_agent_id:
        raise ValueError("ELEVENLABS_AGENT_ID not configured.")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": settings.elevenlabs_agent_id},
            headers={"xi-api-key": settings.elevenlabs_api_key},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()

    return {
        "signed_url": data["signed_url"],
        "dynamic_variables": {
            "candidate_name": candidate_name,
            "job_role": job_role,
            "resume_summary": resume_summary,
            "interviewer_name": interviewer_name,
        },
    }
