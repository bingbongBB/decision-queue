import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  createRequest,
  getRequest,
  listRequests,
  recordDecision,
} from "./api/requests";
import CreateRequestForm from "./components/CreateRequestForm";
import QueueControls from "./components/QueueControls";
import RequestDetail from "./components/RequestDetail";
import RequestQueue from "./components/RequestQueue";
import type {
  CreateRequestInput,
  DecisionInput,
  QueueFilters,
  RequestRecord,
} from "./types";

const initialFilters: QueueFilters = {
  status: "",
  urgency: "",
  sort: "",
  order: "desc",
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Unable to reach the Decision Queue API. Check Docker Compose and try again.";
}

export default function App() {
  const [filters, setFilters] = useState<QueueFilters>(initialFilters);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);

    try {
      setRequests(await listRequests(filters));
    } catch (error) {
      setQueueError(getErrorMessage(error));
    } finally {
      setQueueLoading(false);
    }
  }, [filters]);

  const loadDetail = useCallback(async (requestId: number) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setSelectedRequest(await getRequest(requestId));
    } catch (error) {
      setDetailError(getErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (selectedRequestId === null) {
      setSelectedRequest(null);
      setDetailError(null);
      return;
    }

    void loadDetail(selectedRequestId);
  }, [loadDetail, selectedRequestId]);

  async function refreshQueue() {
    try {
      setRequests(await listRequests(filters));
      setQueueError(null);
    } catch (error) {
      setQueueError(getErrorMessage(error));
    }
  }

  async function handleCreate(input: CreateRequestInput) {
    const created = await createRequest(input);
    setCreateFormOpen(false);
    setSelectedRequestId(created.id);
    setSelectedRequest(created);
    await refreshQueue();
  }

  async function handleDecision(input: DecisionInput) {
    if (selectedRequestId === null) return;

    setSelectedRequest(await recordDecision(selectedRequestId, input));
    await refreshQueue();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Decision Queue</h1>
        <button
          className="primary-button"
          type="button"
          onClick={() => setCreateFormOpen((open) => !open)}
        >
          {createFormOpen ? "Close form" : "New request"}
        </button>
      </header>

      <main className="page">
        {createFormOpen && (
          <CreateRequestForm
            onCancel={() => setCreateFormOpen(false)}
            onSubmit={handleCreate}
          />
        )}

        <div className="workspace">
          <section className="queue-panel" aria-labelledby="queue-title">
            <div className="panel-heading">
              <h2 id="queue-title">Request queue</h2>
              {queueLoading && requests.length > 0 && (
                <span className="refreshing" role="status">Refreshing…</span>
              )}
            </div>

            <QueueControls filters={filters} onChange={setFilters} />

            {queueError && (
              <div className="error-banner" role="alert">
                <span>{queueError}</span>
                <button className="text-button" type="button" onClick={() => void loadQueue()}>
                  Try again
                </button>
              </div>
            )}

            <RequestQueue
              requests={requests}
              selectedRequestId={selectedRequestId}
              loading={queueLoading}
              onSelect={setSelectedRequestId}
              onCreate={() => setCreateFormOpen(true)}
            />
          </section>

          <RequestDetail
            request={selectedRequest}
            loading={detailLoading}
            error={detailError}
            onClose={() => setSelectedRequestId(null)}
            onDecision={handleDecision}
            onRetry={() => {
              if (selectedRequestId !== null) void loadDetail(selectedRequestId);
            }}
          />
        </div>
      </main>
    </div>
  );
}
