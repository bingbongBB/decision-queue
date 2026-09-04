import type { RequestRecord } from "../types";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";

interface RequestQueueProps {
  requests: RequestRecord[];
  selectedRequestId: number | null;
  loading: boolean;
  onSelect: (requestId: number) => void;
  onCreate: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export default function RequestQueue({
  requests,
  selectedRequestId,
  loading,
  onSelect,
  onCreate,
}: RequestQueueProps) {
  if (loading && requests.length === 0) {
    return (
      <div className="queue-state" role="status">
        <span className="spinner" aria-hidden="true" />
        <strong>Loading decision queue…</strong>
        <span>Retrieving the latest requests.</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="queue-state queue-state--empty">
        <div className="empty-icon" aria-hidden="true">✓</div>
        <strong>No requests found</strong>
        <span>Adjust the filters or add a new request to the queue.</span>
        <button className="secondary-button" type="button" onClick={onCreate}>
          Add request
        </button>
      </div>
    );
  }

  return (
    <div className="request-list" aria-label="Decision queue">
      <div className="request-list__header" aria-hidden="true">
        <span>Request</span>
        <span>Status</span>
        <span>Urgency</span>
        <span>Created</span>
      </div>

      {requests.map((request) => (
        <button
          key={request.id}
          className={`request-row${
            selectedRequestId === request.id ? " request-row--selected" : ""
          }`}
          type="button"
          aria-pressed={selectedRequestId === request.id}
          onClick={() => onSelect(request.id)}
        >
          <span className="request-row__title">
            <strong>{request.title}</strong>
          </span>
          <StatusBadge status={request.status} />
          <UrgencyBadge urgency={request.urgency} />
          <span className="request-row__date">{formatDate(request.created_at)}</span>
          <span className="request-row__arrow" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  );
}
