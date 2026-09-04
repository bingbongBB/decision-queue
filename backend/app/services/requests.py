from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.request import Request, RequestStatus, Urgency
from app.schemas.request import DecisionCreate, RequestCreate, RequestSort, SortOrder


class RequestNotFoundError(Exception):
    """Raised when a requested Request does not exist."""


class RequestAlreadyDecidedError(Exception):
    """Raised when a final decision has already been recorded."""


def create_request(session: Session, request_data: RequestCreate) -> Request:
    request = Request(
        title=request_data.title,
        problem_statement=request_data.problem_statement,
        expected_impact=request_data.expected_impact,
        urgency=request_data.urgency,
    )
    session.add(request)
    session.commit()
    session.refresh(request)

    return request


def list_requests(
    session: Session,
    *,
    status_filter: RequestStatus | None = None,
    urgency_filter: Urgency | None = None,
    sort_by: RequestSort | None = None,
    sort_order: SortOrder = SortOrder.DESC,
) -> list[Request]:
    statement = select(Request)

    if status_filter is not None:
        statement = statement.where(Request.status == status_filter)
    if urgency_filter is not None:
        statement = statement.where(Request.urgency == urgency_filter)

    if sort_by is None:
        statement = statement.order_by(
            Request.status.asc(),
            Request.urgency.desc(),
            Request.created_at.desc(),
            Request.id.desc(),
        )
    else:
        sort_expression = {
            RequestSort.STATUS: Request.status,
            RequestSort.URGENCY: Request.urgency,
            RequestSort.CREATED_AT: Request.created_at,
        }[sort_by]
        ordered_expression = (
            sort_expression.asc()
            if sort_order is SortOrder.ASC
            else sort_expression.desc()
        )
        statement = statement.order_by(
            ordered_expression,
            Request.created_at.desc(),
            Request.id.desc(),
        )

    return list(session.scalars(statement).all())


def get_request(session: Session, request_id: int) -> Request | None:
    return session.get(Request, request_id)


def record_decision(
    session: Session,
    request_id: int,
    decision_data: DecisionCreate,
) -> Request:
    statement = select(Request).where(Request.id == request_id)
    request = session.scalar(statement)

    if request is None:
        raise RequestNotFoundError
    if request.status is not RequestStatus.PENDING:
        raise RequestAlreadyDecidedError

    request.status = RequestStatus(decision_data.outcome.value)
    request.decision_reason = decision_data.reason
    request.decided_at = datetime.now(UTC)
    session.commit()
    session.refresh(request)

    return request
