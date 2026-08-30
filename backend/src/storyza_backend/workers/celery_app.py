from celery import Celery

from storyza_backend.core.config import settings

celery_app = Celery(
    "storyza",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["storyza_backend.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)


@celery_app.task(name="storyza.export.process")
def process_export_job(job_id: str) -> str:

    return f"queued:{job_id}"