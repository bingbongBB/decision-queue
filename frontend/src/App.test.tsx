import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { RequestRecord } from "./types";

const pendingRequest: RequestRecord = {
  id: 1,
  title: "Improve partner onboarding",
  problem_statement: "Partners cannot see which setup steps remain.",
  expected_impact: "Reduce setup time and support requests.",
  urgency: "high",
  status: "pending",
  decision_reason: null,
  created_at: "2026-08-30T12:00:00Z",
  decided_at: null,
};

const acceptedRequest: RequestRecord = {
  ...pendingRequest,
  id: 2,
  title: "Add weekly partner digest",
  urgency: "medium",
  status: "accepted",
  decision_reason: "The impact is clear and implementation is small.",
  decided_at: "2026-08-31T15:30:00Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installApiMock(initialRequests: RequestRecord[] = [pendingRequest, acceptedRequest]) {
  let requests = [...initialRequests];

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "POST" && url.endsWith("/api/requests")) {
      const inputBody = JSON.parse(String(init?.body));
      const created: RequestRecord = {
        id: 3,
        ...inputBody,
        status: "pending",
        decision_reason: null,
        created_at: "2026-09-01T12:00:00Z",
        decided_at: null,
      };
      requests = [created, ...requests];
      return jsonResponse(created, 201);
    }

    if (method === "POST" && url.endsWith("/api/requests/1/decision")) {
      const decision = JSON.parse(String(init?.body));
      const updated: RequestRecord = {
        ...pendingRequest,
        status: decision.outcome,
        decision_reason: decision.reason,
        decided_at: "2026-09-01T13:00:00Z",
      };
      requests = requests.map((request) => (request.id === 1 ? updated : request));
      return jsonResponse(updated);
    }

    const detailMatch = url.match(/\/api\/requests\/(\d+)$/);
    if (method === "GET" && detailMatch) {
      const request = requests.find((item) => item.id === Number(detailMatch[1]));
      return request
        ? jsonResponse(request)
        : jsonResponse({ detail: "Request not found." }, 404);
    }

    if (method === "GET" && url.includes("/api/requests")) {
      const parsedUrl = new URL(url);
      const status = parsedUrl.searchParams.get("status");
      const urgency = parsedUrl.searchParams.get("urgency");
      return jsonResponse(
        requests.filter(
          (request) =>
            (!status || request.status === status) &&
            (!urgency || request.urgency === urgency),
        ),
      );
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

describe("Decision Queue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the current state and useful queue", async () => {
    installApiMock();

    render(<App />);

    expect(await screen.findByText("Improve partner onboarding")).toBeInTheDocument();
    expect(screen.getByText("Add weekly partner digest")).toBeInTheDocument();

    const queue = screen.getByLabelText("Decision queue");
    expect(within(queue).getByText("Pending")).toBeInTheDocument();
    expect(within(queue).getByText("Accepted")).toBeInTheDocument();
  });

  it("sends status and urgency filters to the queue API", async () => {
    const fetchMock = installApiMock();
    render(<App />);
    await screen.findByText("Improve partner onboarding");

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "pending" },
    });
    fireEvent.change(screen.getByLabelText("Filter by urgency"), {
      target: { value: "high" },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) => {
          const url = String(input);
          return url.includes("status=pending") && url.includes("urgency=high");
        }),
      ).toBe(true);
    });
  });

  it("creates a request and opens its detail", async () => {
    const fetchMock = installApiMock([]);
    render(<App />);
    await screen.findByText("No requests found");

    fireEvent.click(screen.getByRole("button", { name: /new request/i }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Export partner request history" },
    });
    fireEvent.change(screen.getByLabelText("Problem statement"), {
      target: { value: "Partners currently prepare reports manually." },
    });
    fireEvent.change(screen.getByLabelText("Expected impact"), {
      target: { value: "Reduce recurring reporting work." },
    });
    fireEvent.click(screen.getByLabelText("high"));
    fireEvent.click(screen.getByRole("button", { name: "Add to queue" }));

    expect(
      await screen.findByLabelText("Request detail: Export partner request history"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create a request" })).not.toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).endsWith("/api/requests") && init?.method === "POST",
    );
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      title: "Export partner request history",
      urgency: "high",
    });
  });

  it("opens a pending request and records a decision", async () => {
    installApiMock([pendingRequest]);
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Improve partner onboarding/ }),
    );
    const detail = await screen.findByLabelText(
      "Request detail: Improve partner onboarding",
    );

    fireEvent.click(within(detail).getByLabelText(/Defer/));
    fireEvent.change(within(detail).getByLabelText("Short reason"), {
      target: { value: "Validate the impact with two more partner interviews." },
    });
    fireEvent.click(within(detail).getByRole("button", { name: "Record decision" }));

    const decisionResult = (await within(detail).findByText("Decision recorded")).closest(
      "section",
    );
    expect(decisionResult).not.toBeNull();
    expect(within(decisionResult!).getByText("Deferred")).toBeInTheDocument();
    expect(
      within(detail).getByText("Validate the impact with two more partner interviews."),
    ).toBeInTheDocument();
  });

  it("shows a useful API connection error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Connection failed"));

    render(<App />);

    expect(
      await screen.findByText(
        "Unable to reach the Decision Queue API. Check Docker Compose and try again.",
      ),
    ).toBeInTheDocument();
  });
});
