import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser
from storyza_backend.api.projects import _get_owned_project
from storyza_backend.core.config import settings
from storyza_backend.core.db import get_db
from storyza_backend.models.project import ChatMessage
from storyza_backend.schemas.service import (
    AiAssistRequest,
    AiAssistResponse,
    ChatRequest,
    ChatResponse,
    VoiceCommandRequest,
    VoiceCommandResponse,
)
from storyza_backend.schemas.service import (
    ChatMessage as ChatMessageSchema,
)
from storyza_backend.services.ai.chat import chat_with_assistant
from storyza_backend.services.ai.service import ai_service
from storyza_backend.services.ai.voice import parse_voice_command

router = APIRouter(prefix="/ai", tags=["ai"])

CHAT_CONTEXT_LIMIT = 20
CHAT_HISTORY_LIMIT = 100


async def _list_chat_messages(db: AsyncSession, project_id: uuid.UUID) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(CHAT_HISTORY_LIMIT)
    )
    return list(result.scalars().all())


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


@router.get("/chat", response_model=list[ChatMessageSchema])
async def get_chat_history(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    project_id: Annotated[uuid.UUID, Query()],
) -> list[ChatMessageSchema]:
    project = await _get_owned_project(db, user.id, str(project_id))
    saved = await _list_chat_messages(db, project.id)
    return [
        ChatMessageSchema(role=m.role, content=m.content)  # type: ignore[arg-type]
        for m in saved
    ]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatResponse:
    if payload.project_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required to chat",
        )
    project = await _get_owned_project(db, user.id, str(payload.project_id))
    assets = [asset.model_dump() for asset in payload.assets]

    saved = await _list_chat_messages(db, project.id)
    history = [{"role": m.role, "content": m.content} for m in saved][-CHAT_CONTEXT_LIMIT:]

    result = await chat_with_assistant(message=payload.message, history=history, assets=assets)

    db.add(
        ChatMessage(project_id=project.id, user_id=user.id, role="user", content=payload.message)
    )
    db.add(
        ChatMessage(
            project_id=project.id,
            user_id=user.id,
            role="assistant",
            content=result["reply"],
        )
    )
    await db.commit()

    saved = await _list_chat_messages(db, project.id)
    command = None
    action = result.get("action")
    if action:
        command = VoiceCommandResponse(
            action=action["action"],
            asset=action.get("asset"),
            direction=action.get("direction"),
            provider=result["provider"],
        )
    return ChatResponse(
        reply=result["reply"],
        command=command,
        provider=result["provider"],
        messages=[ChatMessageSchema(role=m.role, content=m.content) for m in saved],  # type: ignore[arg-type]
    )