from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.request import Request, RequestStatus


CREATE_REQUEST = {
    "title": "Clarify partner request ownership",
    "problem_statement": "Partner requests do not have a clear owner.",
    "expected_impact": "Reduce review delays and duplicated follow-up.",
    "urgency": "medium",
}


def create_pending_request(client: TestClient) -> dict[str, object]:
    response = client.post("/api/requests", json=CREATE_REQUEST)
    assert response.status_code == 201
    return response.json()


@pytest.mark.parametrize("outcome", ["accepted", "deferred", "declined"])
def test_record_decision_updates_request_atomically(
    client: TestClient,
    db_session: Session,
    outcome: str,
) -> None:
    created = create_pending_request(client)

    response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={
            "outcome": outcome,
            "reason": "The team reviewed the expected partner impact.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == outcome
    assert body["decision_reason"] == (
        "The team reviewed the expected partner impact."
    )
    assert datetime.fromisoformat(body["decided_at"]) is not None

    persisted_request = db_session.get(Request, created["id"])
    assert persisted_request is not None
    assert persisted_request.status is RequestStatus(outcome)
    assert persisted_request.decision_reason == body["decision_reason"]
    assert persisted_request.decided_at is not None

    detail_response = client.get(f"/api/requests/{created['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["status"] == outcome


def test_record_decision_trims_reason(client: TestClient) -> None:
    created = create_pending_request(client)

    response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={
            "outcome": "accepted",
            "reason": "  The expected impact is clear.  ",
        },
    )

    assert response.status_code == 200
    assert response.json()["decision_reason"] == "The expected impact is clear."


@pytest.mark.parametrize("field", ["outcome", "reason"])
def test_record_decision_requires_all_fields(
    client: TestClient,
    field: str,
) -> None:
    created = create_pending_request(client)
    payload = {
        "outcome": "deferred",
        "reason": "More partner feedback is needed.",
    }
    payload.pop(field)

    response = client.post(
        f"/api/requests/{created['id']}/decision",
        json=payload,
    )

    assert response.status_code == 422


def test_record_decision_rejects_blank_reason(client: TestClient) -> None:
    created = create_pending_request(client)

    response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={"outcome": "declined", "reason": "   "},
    )

    assert response.status_code == 422


def test_record_decision_rejects_pending_as_outcome(client: TestClient) -> None:
    created = create_pending_request(client)

    response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={"outcome": "pending", "reason": "This is not a final decision."},
    )

    assert response.status_code == 422


def test_record_decision_returns_not_found(client: TestClient) -> None:
    response = client.post(
        "/api/requests/999999/decision",
        json={"outcome": "accepted", "reason": "The impact is clear."},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Request not found."}


def test_record_decision_prevents_overwriting_existing_decision(
    client: TestClient,
    db_session: Session,
) -> None:
    created = create_pending_request(client)
    first_response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={"outcome": "accepted", "reason": "The impact is clear."},
    )
    assert first_response.status_code == 200

    second_response = client.post(
        f"/api/requests/{created['id']}/decision",
        json={"outcome": "declined", "reason": "This must not overwrite data."},
    )

    assert second_response.status_code == 409
    assert second_response.json() == {
        "detail": "A decision has already been recorded for this request.",
    }

    persisted_request = db_session.get(Request, created["id"])
    assert persisted_request is not None
    assert persisted_request.status is RequestStatus.ACCEPTED
    assert persisted_request.decision_reason == "The impact is clear."
