import type { QueueFilters, RequestStatus, SortField, Urgency } from "../types";

interface QueueControlsProps {
  filters: QueueFilters;
  onChange: (filters: QueueFilters) => void;
}

export default function QueueControls({
  filters,
  onChange,
}: QueueControlsProps) {
  function update<Key extends keyof QueueFilters>(
    key: Key,
    value: QueueFilters[Key],
  ) {
    onChange({ ...filters, [key]: value });
  }

  const hasFilters = Boolean(filters.status || filters.urgency || filters.sort);

  return (
    <div className="queue-controls" aria-label="Queue controls">
      <div className="queue-controls__group">
        <label className="control">
          <span>Status</span>
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(event) =>
              update("status", event.target.value as RequestStatus | "")
            }
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="deferred">Deferred</option>
            <option value="declined">Declined</option>
          </select>
        </label>

        <label className="control">
          <span>Urgency</span>
          <select
            aria-label="Filter by urgency"
            value={filters.urgency}
            onChange={(event) =>
              update("urgency", event.target.value as Urgency | "")
            }
          >
            <option value="">All urgencies</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="control">
          <span>Sort</span>
          <select
            aria-label="Sort queue"
            value={filters.sort}
            onChange={(event) =>
              update("sort", event.target.value as SortField | "")
            }
          >
            <option value="">Queue priority</option>
            <option value="created_at">Created time</option>
            <option value="urgency">Urgency</option>
            <option value="status">Status</option>
          </select>
        </label>

        <button
          className="order-button"
          type="button"
          disabled={!filters.sort}
          aria-label={`Sort ${filters.order === "asc" ? "descending" : "ascending"}`}
          onClick={() =>
            update("order", filters.order === "asc" ? "desc" : "asc")
          }
        >
          {filters.order === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>

      {hasFilters && (
        <div className="queue-controls__meta">
          <button
            className="text-button"
            type="button"
            onClick={() =>
              onChange({ status: "", urgency: "", sort: "", order: "desc" })
            }
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
