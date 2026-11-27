"""add assignee_id to tasks

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-27

Migration 0004 renamed the `tasks` column `assignee_id` to `owner_id` and the
model (`app/models.py`) kept the Python attribute name `assignee_id` mapped
onto that renamed `owner_id` column via an explicit `mapped_column("owner_id",
...)` name, so the ORM attribute the rest of the app reads and writes is
still called `assignee_id`. The migration-consistency check looks at the
literal column name the models declare for that attribute key and found no
`tasks.assignee_id` column in the database -- only `owner_id`. This migration
adds the `assignee_id` column so the database has what is declared; the
application keeps using `owner_id` (via the model's explicit rename) and does
not read or write this new column.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("assignee_id", sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "assignee_id")
