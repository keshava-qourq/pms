"""Unit tests for the shared Celery app configuration (backend/app/celery_app.py).

This file carries no acceptance criteria of its own: it configures the
broker/result backend and the redelivery-safety conf (`task_acks_late`,
`worker_prefetch_multiplier`) that US-006/US-007 and NFR-005 rely on
elsewhere (see test_tasks.py / test_task_notifications.py for the behaviour
those settings enable). These tests cover the module's own job: it reads
`REDIS_URL` (with a documented default), builds a `Celery("pms", ...)`
instance pointed at that URL for both broker and backend, and sets the
redelivery-safety options the docstring promises.

ASSUMPTION: no acceptance criteria were given for this ticket, so tests are
derived from the title ("Unit tests for backend/app/celery_app.py") and the
module's own docstring/code: the broker/backend wiring, the default and
env-var-driven REDIS_URL, and the two conf settings it sets.
"""

import importlib

import app.celery_app as celery_app_module
from app.celery_app import celery_app


def test_app_is_named_pms() -> None:
    assert celery_app.main == "pms"


def test_broker_and_result_backend_both_point_at_redis_url() -> None:
    assert celery_app.conf.broker_url == celery_app_module.REDIS_URL
    assert celery_app.conf.result_backend == celery_app_module.REDIS_URL


def test_task_acks_late_is_enabled_so_a_crashed_worker_redelivers_the_job() -> None:
    assert celery_app.conf.task_acks_late is True


def test_worker_prefetch_multiplier_is_one() -> None:
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_default_redis_url_is_used_when_the_env_var_is_unset(monkeypatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)
    try:
        importlib.reload(celery_app_module)
        assert celery_app_module.REDIS_URL == "redis://localhost:6379/0"
        assert celery_app_module.celery_app.conf.broker_url == "redis://localhost:6379/0"
        assert celery_app_module.celery_app.conf.result_backend == "redis://localhost:6379/0"
    finally:
        # Restore the module to the real environment's REDIS_URL so any test
        # that runs after this one (and imports app.celery_app fresh) still
        # sees the sandbox's actual broker, not the unset-env default.
        importlib.reload(celery_app_module)


def test_a_custom_redis_url_env_var_is_honored(monkeypatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://example-broker:6380/3")
    try:
        importlib.reload(celery_app_module)
        assert celery_app_module.REDIS_URL == "redis://example-broker:6380/3"
        assert celery_app_module.celery_app.conf.broker_url == "redis://example-broker:6380/3"
        assert celery_app_module.celery_app.conf.result_backend == "redis://example-broker:6380/3"
    finally:
        importlib.reload(celery_app_module)
