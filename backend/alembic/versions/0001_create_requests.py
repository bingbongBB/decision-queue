"""Create requests table.

Revision ID: 0001_create_requests
Revises:
Create Date: 2026-09-01
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_create_requests"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

urgency_enum = postgresql.ENUM(
    "low",
    "medium",
    "high",
    name="request_urgency",
    create_type=False,
)
status_enum = postgresql.ENUM(
    "pending",
    "accepted",
    "deferred",
    "declined",
    name="request_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    urgency_enum.create(bind, checkfirst=True)
    status_enum.create(bind, checkfirst=True)

    op.create_table(
        "requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=False),
        sa.Column("expected_impact", sa.Text(), nullable=False),
        sa.Column("urgency", urgency_enum, nullable=False),
        sa.Column(
            "status",
            status_enum,
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(status = 'pending' AND decision_reason IS NULL AND decided_at IS NULL) "
            "OR (status <> 'pending' AND decision_reason IS NOT NULL "
            "AND char_length(btrim(decision_reason)) > 0 AND decided_at IS NOT NULL)",
            name="ck_requests_decision_fields_match_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("requests")

    bind = op.get_bind()
    status_enum.drop(bind, checkfirst=True)
    urgency_enum.drop(bind, checkfirst=True)
