import type { RequestStatus, Urgency } from "../types";

const statusLabels: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  deferred: "Deferred",
  declined: "Declined",
};

const urgencyLabels: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`badge badge--status badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`badge badge--urgency badge--urgency-${urgency}`}>
      {urgencyLabels[urgency]}
    </span>
  );
}
