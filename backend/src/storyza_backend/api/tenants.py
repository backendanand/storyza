from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser, require_roles
from storyza_backend.core.db import get_db
from storyza_backend.models.enums import UserRole
from storyza_backend.models.tenant import ClassMembership, Classroom, School
from storyza_backend.schemas.common import ORMModel

router = APIRouter(tags=["schools"])

platform_admin = require_roles(UserRole.PLATFORM_ADMIN)
school_admin = require_roles(UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)


class SchoolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=2, max_length=64)


class SchoolRead(ORMModel):
    id: str
    name: str
    code: str
    active: bool


class ClassroomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    grade: str | None = Field(default=None, max_length=64)


class ClassroomRead(ORMModel):
    id: str
    name: str
    grade: str | None


@router.get("/schools", response_model=list[SchoolRead], dependencies=[Depends(platform_admin)])
async def list_schools(db: Annotated[AsyncSession, Depends(get_db)]) -> list[School]:
    result = await db.execute(select(School).order_by(School.created_at.desc()))
    return list(result.scalars().all())


@router.post(
    "/schools",
    response_model=SchoolRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(platform_admin)],
)
async def create_school(
    payload: SchoolCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> School:
    existing = (
        await db.execute(select(School).where(School.code == payload.code))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="School code already in use",
        )
    school = School(name=payload.name, code=payload.code)
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return school


@router.get(
    "/schools/my/classrooms",
    response_model=list[ClassroomRead],
    dependencies=[Depends(school_admin)],
)
async def my_classrooms(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Classroom]:
    if user.school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not linked to a school",
        )
    result = await db.execute(
        select(Classroom)
        .where(Classroom.school_id == user.school_id)
        .order_by(Classroom.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/schools/my/classrooms",
    response_model=ClassroomRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(school_admin)],
)
async def create_classroom(
    payload: ClassroomCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Classroom:
    if user.school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not linked to a school",
        )
    classroom = Classroom(name=payload.name, grade=payload.grade, school_id=user.school_id)
    db.add(classroom)
    await db.commit()
    await db.refresh(classroom)
    return classroom


@router.get(
    "/schools/my/stats",
    dependencies=[Depends(school_admin)],
)
async def school_stats(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if user.school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not linked to a school",
        )
    students = (
        await db.execute(
            select(func.count(func.distinct(ClassMembership.user_id)))
            .join(Classroom, Classroom.id == ClassMembership.classroom_id)
            .where(
                Classroom.school_id == user.school_id,
                ClassMembership.role == UserRole.STUDENT,
            )
        )
    ).scalar_one()
    classes = (
        await db.execute(
            select(func.count()).select_from(Classroom).where(Classroom.school_id == user.school_id)
        )
    ).scalar_one()
    return {"school_id": str(user.school_id), "students": students, "classes": classes}