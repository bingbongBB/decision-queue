import { useState, type FormEvent } from "react";

import { ApiError } from "../api/requests";
import type { CreateRequestInput, Urgency } from "../types";

interface CreateRequestFormProps {
  onCancel: () => void;
  onSubmit: (input: CreateRequestInput) => Promise<void>;
}

export default function CreateRequestForm({
  onCancel,
  onSubmit,
}: CreateRequestFormProps) {
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [expectedImpact, setExpectedImpact] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title,
        problem_statement: problemStatement,
        expected_impact: expectedImpact,
        urgency,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiError
          ? submissionError
          : new ApiError("Unable to create the request.", 0),
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="create-form" aria-labelledby="create-form-title">
      <h2 id="create-form-title">Create a request</h2>

      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="form-error" role="alert">{error.message}</div>}

        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            required
            value={title}
            aria-invalid={Boolean(error?.fieldErrors.title)}
            onChange={(event) => setTitle(event.target.value)}
          />
          {error?.fieldErrors.title && (
            <small className="field-error">{error.fieldErrors.title}</small>
          )}
        </label>

        <label className="field">
          <span>Problem statement</span>
          <textarea
            required
            rows={3}
            value={problemStatement}
            aria-invalid={Boolean(error?.fieldErrors.problem_statement)}
            onChange={(event) => setProblemStatement(event.target.value)}
          />
          {error?.fieldErrors.problem_statement && (
            <small className="field-error">{error.fieldErrors.problem_statement}</small>
          )}
        </label>

        <label className="field">
          <span>Expected impact</span>
          <textarea
            required
            rows={3}
            value={expectedImpact}
            aria-invalid={Boolean(error?.fieldErrors.expected_impact)}
            onChange={(event) => setExpectedImpact(event.target.value)}
          />
          {error?.fieldErrors.expected_impact && (
            <small className="field-error">{error.fieldErrors.expected_impact}</small>
          )}
        </label>

        <fieldset className="urgency-picker">
          <legend>Urgency</legend>
          {(["low", "medium", "high"] as Urgency[]).map((value) => (
            <label key={value} className="urgency-option">
              <input
                type="radio"
                name="urgency"
                value={value}
                checked={urgency === value}
                onChange={() => setUrgency(value)}
              />
              <span>{value}</span>
            </label>
          ))}
        </fieldset>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Adding request…" : "Add to queue"}
          </button>
        </div>
      </form>
    </section>
  );
}
