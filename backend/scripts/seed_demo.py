"""Replace the bundled fictional demo requests in the local database."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from app.database import SessionLocal
from app.models.request import Request, RequestStatus, Urgency


@dataclass(frozen=True)
class SampleRequest:
    title: str
    problem_statement: str
    expected_impact: str
    urgency: Urgency
    status: RequestStatus
    decision_reason: str | None
    created_ago: timedelta
    decided_ago: timedelta | None


SAMPLE_REQUESTS = (
    SampleRequest(
        "Partner analytics export",
        "Partner teams manually copy dashboard metrics into monthly reports.",
        "Reduce recurring reporting work and data-entry errors.",
        Urgency.HIGH,
        RequestStatus.ACCEPTED,
        "This removes repeated manual reporting work for several partners.",
        timedelta(days=15),
        timedelta(days=14),
    ),
    SampleRequest(
        "Bulk invite team members",
        "Workspace administrators must invite every teammate individually.",
        "Shorten onboarding time for larger partner teams.",
        Urgency.MEDIUM,
        RequestStatus.ACCEPTED,
        "The onboarding benefit is clear and the workflow is well scoped.",
        timedelta(days=14),
        timedelta(days=13),
    ),
    SampleRequest(
        "Mobile approval notifications",
        "Reviewers miss urgent requests when they are away from their desks.",
        "Improve response time for urgent partner decisions.",
        Urgency.HIGH,
        RequestStatus.PENDING,
        None,
        timedelta(hours=2),
        None,
    ),
    SampleRequest(
        "Request template library",
        "Partners repeatedly enter the same context for common request types.",
        "Make request submission faster and more consistent.",
        Urgency.MEDIUM,
        RequestStatus.PENDING,
        None,
        timedelta(days=1),
        None,
    ),
    SampleRequest(
        "CSV contact import",
        "New partners cannot efficiently migrate existing contact lists.",
        "Reduce setup effort during partner onboarding.",
        Urgency.HIGH,
        RequestStatus.PENDING,
        None,
        timedelta(hours=6),
        None,
    ),
    SampleRequest(
        "Custom workspace branding",
        "Partner-facing workspaces do not reflect each organization brand.",
        "Create a more consistent external partner experience.",
        Urgency.LOW,
        RequestStatus.DEFERRED,
        "Revisit after the core review workflow is stable.",
        timedelta(days=12),
        timedelta(days=10),
    ),
    SampleRequest(
        "Weekly queue digest",
        "Reviewers lack a concise summary of requests that still need attention.",
        "Help the team identify pending work at the start of each week.",
        Urgency.MEDIUM,
        RequestStatus.PENDING,
        None,
        timedelta(days=3),
        None,
    ),
    SampleRequest(
        "Duplicate request detection",
        "Similar partner requests are reviewed separately without shared context.",
        "Reduce duplicate review work and consolidate feedback.",
        Urgency.HIGH,
        RequestStatus.PENDING,
        None,
        timedelta(hours=1),
        None,
    ),
    SampleRequest(
        "Decision reason search",
        "Teams cannot quickly locate earlier decisions by their recorded reasoning.",
        "Make prior product decisions easier to reference.",
        Urgency.LOW,
        RequestStatus.DEFERRED,
        "Search is useful but current request volume does not justify it yet.",
        timedelta(days=11),
        timedelta(days=9),
    ),
    SampleRequest(
        "Timezone display preference",
        "Request timestamps are difficult to interpret for distributed partner teams.",
        "Reduce scheduling confusion across regions.",
        Urgency.MEDIUM,
        RequestStatus.PENDING,
        None,
        timedelta(days=4),
        None,
    ),
    SampleRequest(
        "Attachment support",
        "Partners cannot include screenshots or supporting documents with requests.",
        "Give reviewers enough context without separate follow-up.",
        Urgency.HIGH,
        RequestStatus.PENDING,
        None,
        timedelta(hours=5),
        None,
    ),
    SampleRequest(
        "Queue pagination",
        "A long request queue becomes difficult to scan as request volume grows.",
        "Keep queue navigation responsive and manageable.",
        Urgency.LOW,
        RequestStatus.DECLINED,
        "The current queue size does not require pagination.",
        timedelta(days=10),
        timedelta(days=8),
    ),
    SampleRequest(
        "Saved filter views",
        "Reviewers recreate the same queue filters during every session.",
        "Speed up common review workflows.",
        Urgency.MEDIUM,
        RequestStatus.PENDING,
        None,
        timedelta(days=2),
        None,
    ),
    SampleRequest(
        "Request ownership",
        "Partner requests do not identify who is responsible for follow-up.",
        "Clarify accountability and reduce stalled requests.",
        Urgency.HIGH,
        RequestStatus.PENDING,
        None,
        timedelta(hours=3),
        None,
    ),
    SampleRequest(
        "Decision history timeline",
        "Teams only see the latest state and cannot review how a decision evolved.",
        "Improve auditability and shared understanding of product choices.",
        Urgency.LOW,
        RequestStatus.DECLINED,
        "Decision history is outside the current product scope.",
        timedelta(days=9),
        timedelta(days=7),
    ),
)


def seed_demo_requests() -> None:
    now = datetime.now(UTC)
    sample_titles = [sample.title for sample in SAMPLE_REQUESTS]

    with SessionLocal() as session:
        session.execute(delete(Request).where(Request.title.in_(sample_titles)))
        session.add_all(
            Request(
                title=sample.title,
                problem_statement=sample.problem_statement,
                expected_impact=sample.expected_impact,
                urgency=sample.urgency,
                status=sample.status,
                decision_reason=sample.decision_reason,
                created_at=now - sample.created_ago,
                decided_at=(
                    now - sample.decided_ago
                    if sample.decided_ago is not None
                    else None
                ),
            )
            for sample in SAMPLE_REQUESTS
        )
        session.commit()

    print(f"Seeded {len(SAMPLE_REQUESTS)} fictional demo requests.")


if __name__ == "__main__":
    seed_demo_requests()
