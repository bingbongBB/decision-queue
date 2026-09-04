import type { DecisionInput, RequestRecord } from "../types";
import DecisionForm from "./DecisionForm";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";

interface RequestDetailProps {
  request: RequestRecord | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDecision: (input: DecisionInput) => Promise<void>;
  onRetry: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export default function RequestDetail({
  request,
  loading,
  error,
  onClose,
  onDecision,
  onRetry,
}: RequestDetailProps) {
  if (loading) {
    return (
      <aside className="detail-panel detail-panel--state" aria-label="Request detail">
        <span className="spinner" aria-hidden="true" />
        <strong>Loading request…</strong>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="detail-panel detail-panel--state" aria-label="Request detail">
        <div className="state-icon state-icon--error" aria-hidden="true">!</div>
        <strong>Could not open this request</strong>
        <span>{error}</span>
        <button className="secondary-button" type="button" onClick={onRetry}>
          Try again
        </button>
      </aside>
    );
  }

  if (!request) {
    return (
      <aside className="detail-panel detail-panel--empty" aria-label="Request detail">
        <div className="detail-placeholder" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>Select a request</strong>
        <span>Open an item from the queue to review its context and record a decision.</span>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-label={`Request detail: ${request.title}`}>
      <div className="detail-panel__header">
        <button className="icon-button" type="button" aria-label="Close request detail" onClick={onClose}>
          ×
        </button>
      </div>

      <h2>{request.title}</h2>
      <div className="detail-panel__badges">
        <StatusBadge status={request.status} />
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <dl className="detail-copy">
        <div>
          <dt>Problem statement</dt>
          <dd>{request.problem_statement}</dd>
        </div>
        <div>
          <dt>Expected impact</dt>
          <dd>{request.expected_impact}</dd>
        </div>
      </dl>

      <div className="detail-meta">
        <span>Created</span>
        <strong>{formatDate(request.created_at)}</strong>
      </div>

      {request.status === "pending" ? (
        <DecisionForm onSubmit={onDecision} />
      ) : (
        <section className={`decision-result decision-result--${request.status}`}>
          <p className="eyebrow">Decision recorded</p>
          <div className="decision-result__title">
            <StatusBadge status={request.status} />
            {request.decided_at && <time>{formatDate(request.decided_at)}</time>}
          </div>
          <blockquote>{request.decision_reason}</blockquote>
        </section>
      )}
    </aside>
  );
}
