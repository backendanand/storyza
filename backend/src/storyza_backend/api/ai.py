
from fastapi import APIRouter

from storyza_backend.api.deps import CurrentUser
from storyza_backend.schemas.service import AiAssistRequest, AiAssistResponse
from storyza_backend.services.ai.service import ai_service

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