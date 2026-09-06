
from fastapi import APIRouter

from storyza_backend.api.deps import CurrentUser
from storyza_backend.core.config import settings
from storyza_backend.schemas.service import (
    AiAssistRequest,
    AiAssistResponse,
    VoiceCommandRequest,
    VoiceCommandResponse,
)
from storyza_backend.services.ai.service import ai_service
from storyza_backend.services.ai.voice import parse_voice_command

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/assist", response_model=AiAssistResponse)
async def ai_assist(
    payload: AiAssistRequest,
    user: CurrentUser,
) -> AiAssistResponse:
    if not user.is_ai_enabled:
        return AiAssistResponse(provider="none", feature=payload.feature, suggestions=[])

    suggestions = await ai_service.assist(
        user_id=user.id,
        feature=payload.feature,
        prompt=payload.prompt,
        context=payload.context,
        school_id=str(user.school_id) if user.school_id else None,
    )
    return AiAssistResponse(
        provider=ai_service.provider_name,
        feature=payload.feature,
        suggestions=suggestions,
    )


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def voice_command(payload: VoiceCommandRequest) -> VoiceCommandResponse:
    assets = [asset.model_dump() for asset in payload.assets]
    result = await parse_voice_command(payload.transcript, assets)
    return VoiceCommandResponse(
        action=result["action"],
        asset=result.get("asset"),
        direction=result.get("direction"),
        provider="groq" if settings.groq_api_key else "keyword",
    )