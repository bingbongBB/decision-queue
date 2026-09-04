from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.request import Request, RequestStatus, Urgency
from app.schemas.request import (
    DecisionCreate,
    RequestCreate,
    RequestRead,
    RequestSort,
    SortOrder,
)
from app.services import requests as request_service

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    request_data: RequestCreate,
    session: Session = Depends(get_db),
) -> Request:
    return request_service.create_request(session, request_data)


@router.get("", response_model=list[RequestRead])
def list_requests(
    status_filter: Annotated[
        RequestStatus | None,
        Query(alias="status"),
    ] = None,
    urgency_filter: Annotated[
        Urgency | None,
        Query(alias="urgency"),
    ] = None,
    sort_by: Annotated[
        RequestSort | None,
        Query(alias="sort"),
    ] = None,
    sort_order: Annotated[
        SortOrder,
        Query(alias="order"),
    ] = SortOrder.DESC,
    session: Session = Depends(get_db),
) -> list[Request]:
    return request_service.list_requests(
        session,
        status_filter=status_filter,
        urgency_filter=urgency_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: int,
    session: Session = Depends(get_db),
) -> Request:
    request = request_service.get_request(session, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )

    return request


@router.post("/{request_id}/decision", response_model=RequestRead)
def record_decision(
    request_id: int,
    decision_data: DecisionCreate,
    session: Session = Depends(get_db),
) -> Request:
    try:
        return request_service.record_decision(
            session,
            request_id,
            decision_data,
        )
    except request_service.RequestNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        ) from error
    except request_service.RequestAlreadyDecidedError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A decision has already been recorded for this request.",
        ) from error
