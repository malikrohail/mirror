"""Voice narration service using ElevenLabs TTS API."""

from __future__ import annotations

import logging
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.persona import Persona
from app.models.session import Session
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

# Map persona archetypes to ElevenLabs pre-made voice IDs.
# These are stable IDs from the ElevenLabs voice library.
PERSONA_VOICES: dict[str, str] = {
    "default_female": "21m00Tcm4TlvDq8ikWAM",   # Rachel — calm, clear
    "default_male": "29vD33N1CtxCmqQRPOHJ",     # Drew — neutral, professional
    "elderly_female": "MF3mGyEYCl7XYWbV9V6O",   # Emily — warm, mature
    "elderly_male": "VR6AewLTigWG4xSOukaG",     # Arnold — deep, measured
    "young_female": "EXAVITQu4vr4xnSDxMaL",     # Bella — upbeat, youthful
    "young_male": "pNInz6obpgDQGcFmaJgB",       # Adam — energetic, clear
}

# Well-known female persona names for gender heuristic
_FEMALE_NAMES = frozenset({
    "sarah", "emily", "jessica", "maria", "yuki", "priya", "linda",
    "dorothy", "emma", "olivia", "ava", "isabella", "sophia", "mia",
    "charlotte", "amelia", "harper", "evelyn", "abigail", "ella",
    "carmen", "fatima", "aisha", "mei", "rosa", "anna", "helen",
    "margaret", "karen", "betty", "patricia", "jennifer", "elizabeth",
    "susan", "lisa", "nancy", "deborah", "sandra", "carol", "ruth",
})

# Well-known male persona names for gender heuristic
_MALE_NAMES = frozenset({
    "jordan", "robert", "marcus", "david", "james", "michael", "john",
    "william", "richard", "joseph", "thomas", "charles", "daniel",
    "matthew", "anthony", "mark", "steven", "andrew", "paul", "kevin",
    "brian", "george", "edward", "ronald", "timothy", "jason", "jeff",
    "ryan", "jacob", "gary", "nicholas", "eric", "stephen", "larry",
    "ahmed", "raj", "wei", "carlos", "ivan", "ben", "frank", "adam",
})


class NarrationStatus:
    """Status tracker for session narration generation."""

    PENDING = "pending"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"


# In-memory status tracking for narration generation jobs.
# In production, this would use Redis or a database table.
_narration_jobs: dict[str, dict] = {}


class VoiceService:
    """Generates voice narration for session steps using ElevenLabs TTS."""

    def __init__(self, db: AsyncSession, storage: FileStorage | None = None) -> None:
        self.db = db
        self.storage = storage

    def _get_api_key(self) -> str:
        """Return the ElevenLabs API key or raise."""
        key = settings.ELEVENLABS_API_KEY
        if not key:
            raise ValueError(
                "ELEVENLABS_API_KEY not configured. "
                "Set the environment variable to enable voice narration."
            )
        return key

    async def generate_step_audio(self, text: str, voice_id: str) -> bytes:
        """Generate TTS audio for a single step using ElevenLabs API.

        Args:
            text: The think-aloud narration text to convert to speech.
            voice_id: An ElevenLabs voice ID.

        Returns:
            Raw MP3 bytes of the generated audio.

        Raises:
            httpx.HTTPStatusError: If the ElevenLabs API returns an error.
            ValueError: If the API key is not configured.
        """
        api_key = self._get_api_key()
        url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}"

        payload = {
            "text": text,
            "model_id": settings.ELEVENLABS_MODEL_ID,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
            )
            response.raise_for_status()
            return response.content

    async def generate_session_narration(self, session_id: uuid.UUID) -> dict:
        """Generate full narration for a session, one audio file per step.

        Fetches the session with its steps and persona, selects a voice,
        and generates TTS audio for each step that has think_aloud text.
        Audio files are saved to storage.

        Args:
            session_id: The session to generate narration for.

        Returns:
            A status dict with keys: status, total_steps, generated_steps, voice_id.

        Raises:
            ValueError: If the session is not found.
        """
        job_key = str(session_id)
        _narration_jobs[job_key] = {
            "status": NarrationStatus.GENERATING,
            "total_steps": 0,
            "generated_steps": 0,
            "failed_steps": 0,
            "voice_id": None,
            "error": None,
        }

        try:
            # Load session with steps and persona
            result = await self.db.execute(
                select(Session)
                .options(selectinload(Session.steps), selectinload(Session.persona))
                .where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                _narration_jobs[job_key]["status"] = NarrationStatus.FAILED
                _narration_jobs[job_key]["error"] = "Session not found"
                raise ValueError(f"Session {session_id} not found")

            # Select voice based on persona
            persona = session.persona
            voice_id = self.select_voice_for_persona(persona)
            _narration_jobs[job_key]["voice_id"] = voice_id

            # Get steps with think-aloud text, sorted by step number
            steps = sorted(session.steps, key=lambda s: s.step_number)
            narration_steps = [s for s in steps if s.think_aloud]
            _narration_jobs[job_key]["total_steps"] = len(narration_steps)

            if not narration_steps:
                _narration_jobs[job_key]["status"] = NarrationStatus.COMPLETE
                return _narration_jobs[job_key]

            # Generate audio for each step (sequentially to respect rate limits)
            for step in narration_steps:
                try:
                    audio_bytes = await self.generate_step_audio(
                        step.think_aloud, voice_id
                    )

                    # Save audio to storage
                    audio_path = self._narration_path(
                        session.study_id, session_id, step.step_number
                    )
                    if self.storage:
                        await self.storage.write(audio_path, audio_bytes)

                    _narration_jobs[job_key]["generated_steps"] += 1

                except Exception as e:
                    logger.warning(
                        "Failed to generate audio for session %s step %d: %s",
                        session_id,
                        step.step_number,
                        e,
                    )
                    _narration_jobs[job_key]["failed_steps"] += 1

            _narration_jobs[job_key]["status"] = NarrationStatus.COMPLETE
            return _narration_jobs[job_key]

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Narration generation failed for session %s: %s", session_id, e
            )
            _narration_jobs[job_key]["status"] = NarrationStatus.FAILED
            _narration_jobs[job_key]["error"] = str(e)[:500]
            return _narration_jobs[job_key]

    def select_voice_for_persona(self, persona: Persona | None) -> str:
        """Select an appropriate ElevenLabs voice based on persona attributes.

        Uses heuristics based on the persona profile's name, age, and description
        to pick a voice that matches the persona's demographic characteristics.

        Args:
            persona: The persona model instance. May be None for fallback.

        Returns:
            An ElevenLabs voice ID string.
        """
        if not persona or not persona.profile:
            return PERSONA_VOICES["default_female"]

        profile = persona.profile
        age = profile.get("age", 35)
        name = str(profile.get("name", "")).lower().strip()

        # Determine gender heuristic from persona name
        is_female = self._infer_female(name, profile)

        # Select voice based on age and gender
        if age >= 60:
            return PERSONA_VOICES["elderly_female" if is_female else "elderly_male"]
        elif age <= 25:
            return PERSONA_VOICES["young_female" if is_female else "young_male"]
        else:
            return PERSONA_VOICES["default_female" if is_female else "default_male"]

    def _infer_female(self, name: str, profile: dict) -> bool:
        """Infer whether a persona is female from name and profile hints."""
        # Check name against known lists
        first_name = name.split()[0] if name else ""
        if first_name in _FEMALE_NAMES:
            return True
        if first_name in _MALE_NAMES:
            return False

        # Check short_description or template name for gender hints
        desc = str(profile.get("short_description", "")).lower()
        template_name = str(profile.get("template_name", "")).lower()
        combined = f"{desc} {template_name}"

        female_signals = ["she ", "her ", "mother", "mom", "woman", "female", "girl"]
        male_signals = ["he ", "his ", "father", "dad", "man", "male", "boy"]

        female_score = sum(1 for s in female_signals if s in combined)
        male_score = sum(1 for s in male_signals if s in combined)

        if female_score > male_score:
            return True
        if male_score > female_score:
            return False

        # Default to female (Rachel is a well-rounded default voice)
        return True

    def get_narration_status(self, session_id: uuid.UUID) -> dict:
        """Get the current status of narration generation for a session.

        Args:
            session_id: The session to check.

        Returns:
            A status dict, or a default "not_started" dict if no job exists.
        """
        job_key = str(session_id)
        if job_key in _narration_jobs:
            return _narration_jobs[job_key]

        return {
            "status": "not_started",
            "total_steps": 0,
            "generated_steps": 0,
            "failed_steps": 0,
            "voice_id": None,
            "error": None,
        }

    async def get_step_audio(
        self, session_id: uuid.UUID, step_number: int
    ) -> bytes | None:
        """Retrieve the generated audio for a specific step.

        Args:
            session_id: The session that owns the step.
            step_number: The step number to retrieve audio for.

        Returns:
            Raw MP3 bytes if the audio exists, otherwise None.
        """
        if not self.storage:
            return None

        # Look up the session to get study_id for storage path
        result = await self.db.execute(
            select(Session.study_id).where(Session.id == session_id)
        )
        row = result.one_or_none()
        if not row:
            return None

        study_id = row[0]
        audio_path = self._narration_path(study_id, session_id, step_number)

        try:
            return await self.storage.read(audio_path)
        except FileNotFoundError:
            return None

    @staticmethod
    def _narration_path(
        study_id: uuid.UUID, session_id: uuid.UUID, step_number: int
    ) -> str:
        """Build the storage path for a step narration audio file.

        Path format: studies/{study_id}/sessions/{session_id}/narration/step_{NNN}.mp3
        """
        return (
            f"studies/{study_id}/sessions/{session_id}"
            f"/narration/step_{step_number:03d}.mp3"
        )

    async def has_narration(self, session_id: uuid.UUID) -> bool:
        """Check if narration audio exists for at least one step in a session.

        Args:
            session_id: The session to check.

        Returns:
            True if at least one step has narration audio.
        """
        if not self.storage:
            return False

        result = await self.db.execute(
            select(Session.study_id).where(Session.id == session_id)
        )
        row = result.one_or_none()
        if not row:
            return False

        study_id = row[0]
        # Check for step 1 audio as a quick test
        path = self._narration_path(study_id, session_id, 1)
        try:
            await self.storage.read(path)
            return True
        except FileNotFoundError:
            return False
