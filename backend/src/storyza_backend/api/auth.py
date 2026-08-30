from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser, require_roles
from storyza_backend.core.db import get_db
from storyza_backend.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from storyza_backend.models.enums import UserRole, UserStatus
from storyza_backend.models.tenant import AuditLog, School, User
from storyza_backend.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )
    user.last_login_at = None  # set via service when timestamps are wired
    await db.commit()
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    try:
        token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc
    user_id = token_payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active")
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/auth/me", response_model=UserRead)
async def me(user: CurrentUser) -> User:
    return user


@router.post(
    "/auth/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    school_id = None
    if payload.school_id:
        school = await db.get(School, payload.school_id)
        if school is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown school")
        school_id = school.id

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=UserStatus.ACTIVE,
        school_id=school_id,
    )
    db.add(user)
    await db.flush()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            school_id=school_id,
            action="user.register",
            resource_type="user",
            resource_id=str(user.id),
        )
    )
    await db.commit()
    await db.refresh(user)
    return user


admin_only = require_roles(UserRole.PLATFORM_ADMIN)


@router.get(
    "/admin/users",
    response_model=list[UserRead],
    dependencies=[Depends(admin_only)],
)
async def list_users(db: Annotated[AsyncSession, Depends(get_db)]) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(100))
    return list(result.scalars().all())