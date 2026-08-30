from __future__ import annotations

import abc
import uuid

from storyza_backend.core.db import async_session_factory
from storyza_backend.models.tenant import AiInteraction


class AIProvider(abc.ABC):
    name: str

    async def complete(self, feature: str, prompt: str, context: dict) -> list[str]:
        raise NotImplementedError


class MockAIProvider(AIProvider):
    """Placeholder provider so AI features are controllable and non-blocking.

    Replace with a real provider adapter (e.g. OpenAI-compatible HTTP client) behind
    the same interface. Provider credentials stay server-side (FR-AI-001).
    """

    name = "mock"

    async def complete(self, feature: str, prompt: str, context: dict) -> list[str]:
        if feature == "story_assistant":
            return [
                "Begin with a scene that introduces your main character.",
                "Try adding a problem or challenge in the middle of your story.",
                "End with a satisfying solution and show how your character changes.",
            ]
        if feature == "dialogue_assistance":
            return [
                "Try a shorter line so younger readers can follow along.",
                "Add what the character is feeling or doing while they speak.",
            ]
        return ["Try placing objects from left to right so the eye moves across the scene."]


class AIService:
    def __init__(self, provider: AIProvider | None = None) -> None:
        self._provider = provider or MockAIProvider()

    @property
    def provider_name(self) -> str:
        return self._provider.name

    async def assist(
        self,
        user_id: uuid.UUID | str,
        feature: str,
        prompt: str,
        context: dict | None = None,
        school_id: str | None = None,
    ) -> list[str]:
        suggestions = await self._provider.complete(feature, prompt, context or {})
        async with async_session_factory() as session:
            interaction = AiInteraction(
                user_id=str(user_id),
                school_id=school_id,
                provider=self._provider.name,
                feature=feature,
                status="ok",
                request={"prompt": prompt, "context": context or {}},
                response={"suggestions": suggestions},
            )
            session.add(interaction)
            await session.commit()
        return suggestions


ai_service = AIService()