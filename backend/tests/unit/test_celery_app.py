"""Unit tests for `app.celery_app` (the shared Celery app).

The ticket carries no acceptance criteria of its own, so these tests pin the
behaviour the module's docstring and code promise: one `Celery` app named
"pms", broker and result backend both pointed at `REDIS_URL` (read from the
environment with a local default), and the two reliability settings the
architecture requires of every job on this queue -- `task_acks_late=True` and
`worker_prefetch_multiplier=1`, so a worker crash mid-run redelivers rather
than loses the job (US-006, US-007 depend on this).

No `client` fixture, no `TestClient`, no database: this module declares no
tasks and touches no other service, so these tests import it directly and
inspect the object it builds. `REDIS_URL` tests reload the module under a
patched environment (restoring it afterwards) because the constant is bound
once, at import time, from `os.getenv`.
"""

import importlib

from celery import Celery

import app.celery_app as celery_app_module
from app.celery_app import REDIS_URL, celery_app


def test_celery_app_is_a_celery_instance_named_pms() -> None:
    assert isinstance(celery_app, Celery)
    assert celery_app.main == "pms"


def test_broker_and_result_backend_both_point_at_redis_url() -> None:
    assert celery_app.conf.broker_url == REDIS_URL
    assert celery_app.conf.result_backend == REDIS_URL


def test_task_acks_late_is_enabled() -> None:
    # Required so a worker crash mid-run redelivers the job instead of
    # losing it -- every task on this queue must tolerate that redelivery.
    assert celery_app.conf.task_acks_late is True


def test_worker_prefetch_multiplier_is_one() -> None:
    # Paired with task_acks_late: a worker only ever holds one unacked job,
    # so a crash redelivers at most that one job, not a whole prefetched batch.
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_no_tasks_are_registered_by_this_module_alone() -> None:
    # The docstring is explicit: no tasks are registered here. Any task name
    # already known to this app at import time would mean something slipped
    # into the module that the docstring says belongs to feature tickets
    # instead (e.g. app.tasks). Celery's own builtin control tasks are the
    # only ones that should be present.
    registered = set(celery_app.tasks.keys())
    non_builtin = {name for name in registered if not name.startswith("celery.")}
    assert non_builtin == set()


def test_redis_url_defaults_to_localhost_when_env_var_is_unset(monkeypatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)
    try:
        reloaded = importlib.reload(celery_app_module)
        assert reloaded.REDIS_URL == "redis://localhost:6379/0"
    finally:
        importlib.reload(celery_app_module)


def test_redis_url_reads_the_environment_variable_when_set(monkeypatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://example-queue-host:6380/3")
    try:
        reloaded = importlib.reload(celery_app_module)
        assert reloaded.REDIS_URL == "redis://example-queue-host:6380/3"
        assert reloaded.celery_app.conf.broker_url == "redis://example-queue-host:6380/3"
        assert reloaded.celery_app.conf.result_backend == "redis://example-queue-host:6380/3"
    finally:
        importlib.reload(celery_app_module)
