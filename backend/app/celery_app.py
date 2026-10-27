"""The Celery application shared by the API and the notification worker.

The architecture puts outbound Slack and email notifications on a Redis queue
so the API's save returns immediately and a failed send can retry (US-006,
US-007): the API enqueues, `worker`'s tasks consume. Both sides have to agree
on the broker and result backend, so that configuration lives in one module
each can import rather than being redeclared per ticket.

No tasks are registered here -- the routes that enqueue them and the worker
that consumes them are feature work for later tickets. `task_acks_late` and
`worker_prefetch_multiplier=1` are set now because the architecture requires
every job to be safe to run twice: late acknowledgement means a job a worker
crashes mid-run is redelivered, not lost -- whatever task is added here still
has to tolerate that redelivery itself.
"""

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("pms", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
