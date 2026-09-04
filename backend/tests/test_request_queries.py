from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.request import Request, RequestStatus, Urgency


BASE_TIME = datetime(2026, 8, 30, 12, 0, tzinfo=UTC)


def add_request(
    session: Session,
    *,
    title: str,
    urgency: Urgency,
    status: RequestStatus = RequestStatus.PENDING,
    created_at: datetime = BASE_TIME,
) -> Request:
    is_decided = status is not RequestStatus.PENDING
    request = Request(
        title=title,
        problem_statement=f"Problem for {title}.",
        expected_impact=f"Impact for {title}.",
        urgency=urgency,
        status=status,
        decision_reason="Reviewed by the team." if is_decided else None,
        created_at=created_at,
        decided_at=created_at if is_decided else None,
    )
    session.add(request)
    session.flush()

    return request


def test_list_requests_returns_empty_queue(client: TestClient) -> None:
    response = client.get("/api/requests")

    assert response.status_code == 200
    assert response.json() == []


def test_list_requests_uses_useful_default_queue_order(
    client: TestClient,
    db_session: Session,
) -> None:
    add_request(
        db_session,
        title="Accepted high",
        urgency=Urgency.HIGH,
        status=RequestStatus.ACCEPTED,
        created_at=BASE_TIME + timedelta(hours=4),
    )
    add_request(
        db_session,
        title="Pending low",
        urgency=Urgency.LOW,
        created_at=BASE_TIME + timedelta(hours=3),
    )
    add_request(
        db_session,
        title="Pending high older",
        urgency=Urgency.HIGH,
        created_at=BASE_TIME + timedelta(hours=1),
    )
    add_request(
        db_session,
        title="Pending high newer",
        urgency=Urgency.HIGH,
        created_at=BASE_TIME + timedelta(hours=2),
    )

    response = client.get("/api/requests")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == [
        "Pending high newer",
        "Pending high older",
        "Pending low",
        "Accepted high",
    ]


def test_list_requests_combines_status_and_urgency_filters(
    client: TestClient,
    db_session: Session,
) -> None:
    add_request(
        db_session,
        title="Pending high",
        urgency=Urgency.HIGH,
    )
    add_request(
        db_session,
        title="Pending low",
        urgency=Urgency.LOW,
    )
    add_request(
        db_session,
        title="Accepted high",
        urgency=Urgency.HIGH,
        status=RequestStatus.ACCEPTED,
    )

    response = client.get("/api/requests?status=pending&urgency=high")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Pending high"]


@pytest.mark.parametrize(
    ("sort_order", "expected_titles"),
    [
        ("asc", ["Low", "Medium", "High"]),
        ("desc", ["High", "Medium", "Low"]),
    ],
)
def test_list_requests_sorts_by_urgency(
    client: TestClient,
    db_session: Session,
    sort_order: str,
    expected_titles: list[str],
) -> None:
    add_request(db_session, title="Medium", urgency=Urgency.MEDIUM)
    add_request(db_session, title="High", urgency=Urgency.HIGH)
    add_request(db_session, title="Low", urgency=Urgency.LOW)

    response = client.get(f"/api/requests?sort=urgency&order={sort_order}")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == expected_titles


def test_list_requests_sorts_by_status(
    client: TestClient,
    db_session: Session,
) -> None:
    add_request(
        db_session,
        title="Declined",
        urgency=Urgency.LOW,
        status=RequestStatus.DECLINED,
    )
    add_request(
        db_session,
        title="Deferred",
        urgency=Urgency.LOW,
        status=RequestStatus.DEFERRED,
    )
    add_request(
        db_session,
        title="Accepted",
        urgency=Urgency.LOW,
        status=RequestStatus.ACCEPTED,
    )
    add_request(db_session, title="Pending", urgency=Urgency.LOW)

    response = client.get("/api/requests?sort=status&order=asc")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == [
        "Pending",
        "Accepted",
        "Deferred",
        "Declined",
    ]


def test_list_requests_sorts_by_created_time(
    client: TestClient,
    db_session: Session,
) -> None:
    add_request(
        db_session,
        title="Newer",
        urgency=Urgency.LOW,
        created_at=BASE_TIME + timedelta(hours=1),
    )
    add_request(
        db_session,
        title="Older",
        urgency=Urgency.HIGH,
        created_at=BASE_TIME,
    )

    response = client.get("/api/requests?sort=created_at&order=asc")

    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Older", "Newer"]


@pytest.mark.parametrize(
    "query",
    [
        "status=unknown",
        "urgency=critical",
        "sort=title",
        "order=sideways",
    ],
)
def test_list_requests_rejects_invalid_query_values(
    client: TestClient,
    query: str,
) -> None:
    response = client.get(f"/api/requests?{query}")

    assert response.status_code == 422


def test_get_request_returns_request_detail(
    client: TestClient,
    db_session: Session,
) -> None:
    request = add_request(
        db_session,
        title="Partner reporting",
        urgency=Urgency.MEDIUM,
    )

    response = client.get(f"/api/requests/{request.id}")

    assert response.status_code == 200
    assert response.json()["id"] == request.id
    assert response.json()["title"] == "Partner reporting"
    assert response.json()["status"] == "pending"


def test_get_request_returns_not_found(client: TestClient) -> None:
    response = client.get("/api/requests/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Request not found."}
