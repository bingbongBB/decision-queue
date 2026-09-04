export type Urgency = "low" | "medium" | "high";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "deferred"
  | "declined";

export type DecisionOutcome = Exclude<RequestStatus, "pending">;
export type SortField = "status" | "urgency" | "created_at";
export type SortOrder = "asc" | "desc";

export interface RequestRecord {
  id: number;
  title: string;
  problem_statement: string;
  expected_impact: string;
  urgency: Urgency;
  status: RequestStatus;
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface CreateRequestInput {
  title: string;
  problem_statement: string;
  expected_impact: string;
  urgency: Urgency;
}

export interface DecisionInput {
  outcome: DecisionOutcome;
  reason: string;
}

export interface QueueFilters {
  status: RequestStatus | "";
  urgency: Urgency | "";
  sort: SortField | "";
  order: SortOrder;
}
