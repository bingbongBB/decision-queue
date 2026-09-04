from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models.request import RequestStatus, Urgency

NonBlankText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


class RequestSort(StrEnum):
    STATUS = "status"
    URGENCY = "urgency"
    CREATED_AT = "created_at"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class DecisionOutcome(StrEnum):
    ACCEPTED = "accepted"
    DEFERRED = "deferred"
    DECLINED = "declined"


class RequestCreate(BaseModel):
    title: NonBlankText
    problem_statement: NonBlankText
    expected_impact: NonBlankText
    urgency: Urgency


class DecisionCreate(BaseModel):
    outcome: DecisionOutcome
    reason: NonBlankText


class RequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    problem_statement: str
    expected_impact: str
    urgency: Urgency
    status: RequestStatus
    decision_reason: str | None
    created_at: datetime
    decided_at: datetime | None
