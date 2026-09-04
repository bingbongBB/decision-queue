import type {
  CreateRequestInput,
  DecisionInput,
  QueueFilters,
  RequestRecord,
} from "../types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

interface ErrorPayload {
  detail?: string | ValidationIssue[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  let payload: ErrorPayload = {};

  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    return new ApiError("The server returned an unexpected response.", response.status);
  }

  if (typeof payload.detail === "string") {
    return new ApiError(payload.detail, response.status);
  }

  if (Array.isArray(payload.detail)) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of payload.detail) {
      const field = issue.loc?.at(-1);
      if (typeof field === "string" && issue.msg) {
        fieldErrors[field] = issue.msg;
      }
    }

    return new ApiError(
      "Please review the highlighted fields.",
      response.status,
      fieldErrors,
    );
  }

  return new ApiError("Unable to complete the request.", response.status);
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export function listRequests(
  filters: Partial<QueueFilters> = {},
): Promise<RequestRecord[]> {
  const query = new URLSearchParams();

  if (filters.status) query.set("status", filters.status);
  if (filters.urgency) query.set("urgency", filters.urgency);
  if (filters.sort) query.set("sort", filters.sort);
  if (filters.sort && filters.order) query.set("order", filters.order);

  const queryString = query.toString();
  return requestJson<RequestRecord[]>(
    `/api/requests${queryString ? `?${queryString}` : ""}`,
  );
}

export function getRequest(requestId: number): Promise<RequestRecord> {
  return requestJson<RequestRecord>(`/api/requests/${requestId}`);
}

export function createRequest(
  input: CreateRequestInput,
): Promise<RequestRecord> {
  return requestJson<RequestRecord>("/api/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function recordDecision(
  requestId: number,
  input: DecisionInput,
): Promise<RequestRecord> {
  return requestJson<RequestRecord>(`/api/requests/${requestId}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
