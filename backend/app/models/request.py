from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Urgency(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RequestStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DEFERRED = "deferred"
    DECLINED = "declined"


def enum_values(enum_class: type[StrEnum]) -> list[str]:
    return [item.value for item in enum_class]


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    expected_impact: Mapped[str] = mapped_column(Text, nullable=False)
    urgency: Mapped[Urgency] = mapped_column(
        Enum(
            Urgency,
            name="request_urgency",
            values_callable=enum_values,
        ),
        nullable=False,
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(
            RequestStatus,
            name="request_status",
            values_callable=enum_values,
        ),
        nullable=False,
        default=RequestStatus.PENDING,
        server_default=RequestStatus.PENDING.value,
    )
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
