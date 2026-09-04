import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.request import Request, RequestStatus, Urgency


VALID_REQUEST = {
    "title": "Improve partner onboarding",
    "problem_statement": "Partners cannot see which setup steps remain.",
    "expected_impact": "Reduce setup time and support requests.",
    "urgency": "high",
}


def test_create_request_persists_pending_request(
    client: TestClient,
    db_session: Session,
) -> None:
    response = client.post("/api/requests", json=VALID_REQUEST)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == VALID_REQUEST["title"]
    assert body["problem_statement"] == VALID_REQUEST["problem_statement"]
    assert body["expected_impact"] == VALID_REQUEST["expected_impact"]
    assert body["urgency"] == Urgency.HIGH
    assert body["status"] == RequestStatus.PENDING
    assert body["decision_reason"] is None
    assert body["decided_at"] is None

    persisted_request = db_session.scalar(
        select(Request).where(Request.id == body["id"]),
    )
    assert persisted_request is not None
    assert persisted_request.status is RequestStatus.PENDING


def test_create_request_trims_text_fields(client: TestClient) -> None:
    response = client.post(
        "/api/requests",
        json={
            **VALID_REQUEST,
            "title": "  Improve partner onboarding  ",
            "problem_statement": "  Partners need clearer setup steps.  ",
            "expected_impact": "  Reduce support requests.  ",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Improve partner onboarding"
    assert body["problem_statement"] == "Partners need clearer setup steps."
    assert body["expected_impact"] == "Reduce support requests."


@pytest.mark.parametrize(
    "field",
    ["title", "problem_statement", "expected_impact", "urgency"],
)
def test_create_request_rejects_missing_required_field(
    client: TestClient,
    field: str,
) -> None:
    payload = {key: value for key, value in VALID_REQUEST.items() if key != field}

    response = client.post("/api/requests", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "field",
    ["title", "problem_statement", "expected_impact"],
)
def test_create_request_rejects_blank_text(
    client: TestClient,
    field: str,
) -> None:
    response = client.post(
        "/api/requests",
        json={**VALID_REQUEST, field: "   "},
    )

    assert response.status_code == 422


def test_create_request_rejects_invalid_urgency(client: TestClient) -> None:
    response = client.post(
        "/api/requests",
        json={**VALID_REQUEST, "urgency": "critical"},
    )

    assert response.status_code == 422
