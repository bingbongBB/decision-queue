import { useState, type FormEvent } from "react";

import { ApiError } from "../api/requests";
import type { DecisionInput, DecisionOutcome } from "../types";

interface DecisionFormProps {
  onSubmit: (input: DecisionInput) => Promise<void>;
}

const outcomes: Array<{
  value: DecisionOutcome;
  label: string;
}> = [
  { value: "accepted", label: "Accept" },
  { value: "deferred", label: "Defer" },
  { value: "declined", label: "Decline" },
];

export default function DecisionForm({ onSubmit }: DecisionFormProps) {
  const [outcome, setOutcome] = useState<DecisionOutcome>("accepted");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({ outcome, reason });
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiError
          ? submissionError
          : new ApiError("Unable to record the decision.", 0),
      );
      setSubmitting(false);
    }
  }

  return (
    <form className="decision-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <p className="eyebrow">Team decision</p>
        <h3>Record an outcome</h3>
      </div>

      {error && <div className="form-error" role="alert">{error.message}</div>}

      <fieldset className="decision-options">
        <legend className="sr-only">Decision outcome</legend>
        {outcomes.map((item) => (
          <label
            key={item.value}
            className={`decision-option decision-option--${item.value}`}
          >
            <input
              type="radio"
              name="outcome"
              value={item.value}
              checked={outcome === item.value}
              onChange={() => setOutcome(item.value)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span>Short reason</span>
        <textarea
          aria-label="Short reason"
          required
          rows={4}
          value={reason}
          aria-invalid={Boolean(error?.fieldErrors.reason)}
          onChange={(event) => setReason(event.target.value)}
        />
        {error?.fieldErrors.reason && (
          <small className="field-error">{error.fieldErrors.reason}</small>
        )}
      </label>

      <button className="primary-button primary-button--full" type="submit" disabled={submitting}>
        {submitting ? "Recording decision…" : "Record decision"}
      </button>
    </form>
  );
}
