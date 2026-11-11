"""Unit tests for `app.celery_app` (no acceptance criteria of its own).

`celery_app` is pure configuration: one `Celery` instance, its broker/result
backend URL, and the two reliability settings (`task_acks_late`,
`worker_prefetch_multiplier=1`) the module docstring says every task must be
able to rely on for safe redelivery. There is no endpoint and no database
row behind any of this, so these tests inspect the object and its
configuration directly rather than going through a client or a running
worker. Tests are named after the behaviour they cover rather than an AC id,
per the ticket.
"""

import importlib
import os

import app.celery_app as celery_app_module
from app.celery_app import celery_app


def test_celery_app_is_a_celery_instance() -> None:
    from celery import Celery

    assert isinstance(celery_app, Celery)


def test_celery_app_named_pms() -> None:
    assert celery_app.main == "pms"


def test_task_acks_late_is_enabled() -> None:
    # A worker that crashes mid-run must have the job redelivered, not lost
    # (per the module docstring); late acknowledgement is what makes that so.
    assert celery_app.conf.task_acks_late is True


def test_worker_prefetch_multiplier_is_one() -> None:
    # Paired with task_acks_late: a worker only holds one unacknowledged job
    # at a time, so a crash redelivers at most the job it was running.
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_broker_and_backend_default_to_the_module_level_redis_url() -> None:
    # Both the API (enqueuing) and the worker (consuming) import this same
    # module, so they must agree on one broker/backend URL -- the module's
    # REDIS_URL constant -- rather than each reading the environment again.
    assert celery_app.conf.broker_url == celery_app_module.REDIS_URL
    assert celery_app.conf.result_backend == celery_app_module.REDIS_URL


def test_redis_url_falls_back_to_localhost_when_env_var_unset(monkeypatch) -> None:
    original_redis_url = os.environ.get("REDIS_URL")
    monkeypatch.delenv("REDIS_URL", raising=False)
    try:
        reloaded = importlib.reload(celery_app_module)
        assert reloaded.REDIS_URL == "redis://localhost:6379/0"
        assert reloaded.celery_app.conf.broker_url == "redis://localhost:6379/0"
    finally:
        # Put REDIS_URL back exactly as it was and reload again, so the module's
        # top-level `celery_app`/`REDIS_URL` that every other test (and other
        # modules already holding a reference) depend on reflect the real
        # configuration for the rest of the run.
        if original_redis_url is not None:
            monkeypatch.setenv("REDIS_URL", original_redis_url)
        importlib.reload(celery_app_module)


def test_redis_url_honours_the_env_var_when_set(monkeypatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://example-queue-host:6380/3")
    reloaded = importlib.reload(celery_app_module)
    try:
        assert reloaded.REDIS_URL == "redis://example-queue-host:6380/3"
        assert reloaded.celery_app.conf.broker_url == "redis://example-queue-host:6380/3"
        assert reloaded.celery_app.conf.result_backend == "redis://example-queue-host:6380/3"
    finally:
        importlib.reload(celery_app_module)


def test_no_tasks_are_registered_by_this_module() -> None:
    # The module docstring is explicit: "No tasks are registered here" -- any
    # task names present come from importing app.tasks (or another feature
    # module) elsewhere in the process, never from celery_app itself.
    builtin_or_celery_internal = {
        name for name in celery_app.tasks if name.startswith("celery.")
    }
    assert set(celery_app.tasks) - builtin_or_celery_internal == set()
