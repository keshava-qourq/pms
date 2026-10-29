FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
# Schema changes go through Alembic (see backend/app/database.py and
# backend/app/main.py): the migration environment has to ship in the image or
# `alembic upgrade head` below has nothing to run.
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

# Run as an unprivileged user. The service never needs root, and a container that
# drops it limits what a compromise of the app can do to the host.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# Reports the container unhealthy when the app stops answering. Uses the Python
# standard library rather than curl, which the slim base image does not ship.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

# Applies any pending migration before the API starts serving, so a request never
# meets a schema older than the code answering it. The `worker` deployment (see
# docs/sdlc/deployment/deployment-guide.md) builds this same image and overrides
# this CMD with its own `celery -A app.celery_app worker` command instead -- it
# does not need to migrate again.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
