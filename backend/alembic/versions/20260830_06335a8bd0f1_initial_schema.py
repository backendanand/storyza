"""initial schema

Revision ID: 06335a8bd0f1
Revises:
Create Date: 2026-08-30 09:28:28.133775+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '06335a8bd0f1'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Independent reference tables
    op.create_table('badges',
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('description', sa.String(length=512), nullable=True),
    sa.Column('rule', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('icon_url', sa.String(length=1024), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    op.create_table('grades',
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('code', sa.String(length=32), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code'),
    sa.UniqueConstraint('name')
    )
    op.create_table('subjects',
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('code', sa.String(length=32), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code'),
    sa.UniqueConstraint('name')
    )
    op.create_table('schools',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('code', sa.String(length=64), nullable=False),
    sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )

    # Depends on schools
    op.create_table('users',
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('role', sa.Enum('PLATFORM_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', name='user_role'), nullable=False),
    sa.Column('status', sa.Enum('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', name='user_status'), nullable=False),
    sa.Column('school_id', sa.Uuid(), nullable=True),
    sa.Column('is_ai_enabled', sa.Boolean(), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_school_id'), 'users', ['school_id'], unique=False)

    op.create_table('classrooms',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('school_id', sa.Uuid(), nullable=False),
    sa.Column('grade', sa.String(length=64), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_classrooms_school_id'), 'classrooms', ['school_id'], unique=False)

    op.create_table('assets',
    sa.Column('kind', sa.String(length=16), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('media_url', sa.String(length=1024), nullable=False),
    sa.Column('thumbnail_url', sa.String(length=1024), nullable=True),
    sa.Column('meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('age_min', sa.Integer(), nullable=True),
    sa.Column('age_max', sa.Integer(), nullable=True),
    sa.Column('safety_class', sa.String(length=32), nullable=False),
    sa.Column('owner_school_id', sa.Uuid(), nullable=True),
    sa.Column('source', sa.String(length=16), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_school_id'], ['schools.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_kind'), 'assets', ['kind'], unique=False)

    op.create_table('topics',
    sa.Column('name', sa.String(length=128), nullable=False),
    sa.Column('subject_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_topics_subject_id'), 'topics', ['subject_id'], unique=False)

    # Activities depend on grades, subjects and assets
    op.create_table('activities',
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('grade_id', sa.Uuid(), nullable=True),
    sa.Column('subject_id', sa.Uuid(), nullable=True),
    sa.Column('difficulty', sa.String(length=16), nullable=True),
    sa.Column('estimated_minutes', sa.Integer(), nullable=True),
    sa.Column('learning_objective', sa.Text(), nullable=True),
    sa.Column('template_id', sa.Uuid(), nullable=True),
    sa.Column('rubric', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['grade_id'], ['grades.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['template_id'], ['assets.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )

    # Projects: FK to current_version_id added after project_versions exists
    op.create_table('projects',
    sa.Column('owner_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('schema_version', sa.Integer(), nullable=False),
    sa.Column('current_version_id', sa.Uuid(), nullable=True),
    sa.Column('source_activity_id', sa.Uuid(), nullable=True),
    sa.Column('scene_count', sa.Integer(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['source_activity_id'], ['activities.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_owner_id'), 'projects', ['owner_id'], unique=False)

    op.create_table('project_versions',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('document', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('renderer_version', sa.String(length=16), nullable=False),
    sa.Column('checksum', sa.String(length=64), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_versions_project_id'), 'project_versions', ['project_id'], unique=False)
    op.create_foreign_key('fk_projects_current_version_id', 'projects', 'project_versions', ['current_version_id'], ['id'], ondelete='SET NULL')

    op.create_table('challenges',
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(length=1024), nullable=True),
    sa.Column('prompt', sa.String(length=2048), nullable=True),
    sa.Column('badge_id', sa.Uuid(), nullable=True),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['badge_id'], ['badges.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('achievements',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('badge_id', sa.Uuid(), nullable=False),
    sa.Column('awarded_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['badge_id'], ['badges.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_achievements_badge_id'), 'achievements', ['badge_id'], unique=False)
    op.create_index(op.f('ix_achievements_user_id'), 'achievements', ['user_id'], unique=False)

    op.create_table('ai_interactions',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('school_id', sa.Uuid(), nullable=True),
    sa.Column('provider', sa.String(length=64), nullable=False),
    sa.Column('feature', sa.String(length=64), nullable=False),
    sa.Column('prompt_tokens', sa.Integer(), nullable=False),
    sa.Column('completion_tokens', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=32), nullable=False),
    sa.Column('request', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('response', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_interactions_school_id'), 'ai_interactions', ['school_id'], unique=False)
    op.create_index(op.f('ix_ai_interactions_user_id'), 'ai_interactions', ['user_id'], unique=False)

    op.create_table('audit_logs',
    sa.Column('actor_user_id', sa.Uuid(), nullable=True),
    sa.Column('school_id', sa.Uuid(), nullable=True),
    sa.Column('action', sa.String(length=128), nullable=False),
    sa.Column('resource_type', sa.String(length=64), nullable=False),
    sa.Column('resource_id', sa.String(length=64), nullable=True),
    sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_actor_user_id'), 'audit_logs', ['actor_user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_school_id'), 'audit_logs', ['school_id'], unique=False)

    op.create_table('class_memberships',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('classroom_id', sa.Uuid(), nullable=False),
    sa.Column('role', sa.Enum('PLATFORM_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', name='membership_role'), nullable=False),
    sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'classroom_id', 'role', name='uq_class_membership')
    )
    op.create_index(op.f('ix_class_memberships_classroom_id'), 'class_memberships', ['classroom_id'], unique=False)
    op.create_index(op.f('ix_class_memberships_user_id'), 'class_memberships', ['user_id'], unique=False)

    op.create_table('assignments',
    sa.Column('activity_id', sa.Uuid(), nullable=False),
    sa.Column('classroom_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assignments_activity_id'), 'assignments', ['activity_id'], unique=False)
    op.create_index(op.f('ix_assignments_classroom_id'), 'assignments', ['classroom_id'], unique=False)

    op.create_table('export_jobs',
    sa.Column('project_id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('export_format', sa.String(length=8), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('resolution', sa.String(length=32), nullable=True),
    sa.Column('result_url', sa.String(length=1024), nullable=True),
    sa.Column('error', sa.String(length=1024), nullable=True),
    sa.Column('retries', sa.Integer(), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_export_jobs_project_id'), 'export_jobs', ['project_id'], unique=False)
    op.create_index(op.f('ix_export_jobs_status'), 'export_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_export_jobs_user_id'), 'export_jobs', ['user_id'], unique=False)

    op.create_table('submissions',
    sa.Column('assignment_id', sa.Uuid(), nullable=False),
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('project_id', sa.Uuid(), nullable=True),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('assessment', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_assignment_id'), 'submissions', ['assignment_id'], unique=False)
    op.create_index(op.f('ix_submissions_student_id'), 'submissions', ['student_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_submissions_student_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_assignment_id'), table_name='submissions')
    op.drop_table('submissions')
    op.drop_index(op.f('ix_export_jobs_user_id'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_status'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_project_id'), table_name='export_jobs')
    op.drop_table('export_jobs')
    op.drop_index(op.f('ix_assignments_classroom_id'), table_name='assignments')
    op.drop_index(op.f('ix_assignments_activity_id'), table_name='assignments')
    op.drop_table('assignments')
    op.drop_index(op.f('ix_class_memberships_user_id'), table_name='class_memberships')
    op.drop_index(op.f('ix_class_memberships_classroom_id'), table_name='class_memberships')
    op.drop_table('class_memberships')
    op.drop_index(op.f('ix_audit_logs_school_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_actor_user_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_ai_interactions_user_id'), table_name='ai_interactions')
    op.drop_index(op.f('ix_ai_interactions_school_id'), table_name='ai_interactions')
    op.drop_table('ai_interactions')
    op.drop_index(op.f('ix_achievements_user_id'), table_name='achievements')
    op.drop_index(op.f('ix_achievements_badge_id'), table_name='achievements')
    op.drop_table('achievements')
    op.drop_table('challenges')
    op.drop_constraint('fk_projects_current_version_id', 'projects', type_='foreignkey')
    op.drop_index(op.f('ix_project_versions_project_id'), table_name='project_versions')
    op.drop_table('project_versions')
    op.drop_index(op.f('ix_projects_owner_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_table('activities')
    op.drop_index(op.f('ix_topics_subject_id'), table_name='topics')
    op.drop_table('topics')
    op.drop_index(op.f('ix_assets_kind'), table_name='assets')
    op.drop_table('assets')
    op.drop_index(op.f('ix_classrooms_school_id'), table_name='classrooms')
    op.drop_table('classrooms')
    op.drop_index(op.f('ix_users_school_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('schools')
    op.drop_table('subjects')
    op.drop_table('grades')
    op.drop_table('badges')