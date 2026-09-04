# Decision Queue

A local web application for reviewing partner product requests and recording accept, defer, or decline decisions.

## Commands

Requires Docker Desktop with Compose v2. Node.js, Python, and PostgreSQL do not need to be installed on the host.

### Initialize from a clean checkout

```bash
cp .env.example .env
docker compose up --build
```

Copying `.env` is optional — Compose falls back to working local defaults. The backend entrypoint applies Alembic migrations before starting the server, so no manual schema step is needed.

The application runs at <http://localhost:5173> and the API at <http://localhost:8000>.

### Load fictional sample data

After the stack is running, load 15 fictional requests for exploring the queue,
filters, sorting, details, and decision states:

```bash
docker compose exec backend python -m scripts.seed_demo
```

The command is repeatable. It replaces only the 15 bundled sample requests and
preserves requests created separately through the UI or API.

### Run the application

```bash
docker compose up
```

### Run tests

The stack must be running. In a second terminal:

```bash
docker compose exec backend pytest
docker compose exec frontend npm test
```

### Reset local data

```bash
docker compose down --volumes
docker compose up --build
```

`--volumes` deletes the PostgreSQL volume. The next start recreates the schema from migrations with an empty database.

## Completed requirements

Functional:

- Create a request with a title, problem statement, expected impact, and urgency. New requests are stored as `pending`.
- View all requests in a queue ordered pending first, then urgency high to low, then newest first.
- Filter the queue by status and urgency. Sort by status, urgency, or creation time, ascending or descending.
- Open a request and record a decision of accepted, deferred, or declined.
- A decision requires a non-blank reason, stored together with the outcome and the decision time.
- The queue and detail views show current state, which survives page reloads and container restarts.

Non-functional:

- Runs locally with Docker Compose across three services: frontend, backend, and PostgreSQL 17.
- Data persists in PostgreSQL through a named volume.
- The schema is created by Alembic migrations, applied automatically when the backend starts.
- Required input is validated server-side. Invalid input returns HTTP 422 with field-level detail, which the frontend renders next to the relevant input. Invalid query parameters return 422 rather than being ignored.
- 38 automated tests cover the core workflow: 33 backend cases against a real PostgreSQL database, and 5 frontend cases.
- An optional repeatable seed command loads 15 fictional requests for local review.
- All bundled sample data is fictional.
- Nothing is hosted or deployed.

## Known gaps

- **No maximum length on text fields.** Titles, statements, and decision reasons are validated for a minimum of one character after trimming, and are stored in unbounded PostgreSQL text columns. Very long input is accepted, stored, and returned in full, which also inflates every queue response. A `max_length` per field plus a length constraint in the database is the fix.
- **No decision history or audit trail.** A decision is final; a second attempt returns HTTP 409. There is no record of who decided or of any earlier decision.
- **No pagination and no indexes on the filter columns.** The queue endpoint returns the entire result set.
- **No optimistic concurrency.** The 409 response covers a request that is already decided, not two decisions arriving at the same moment.
- **The CHECK constraint is not covered by a test.** The database enforces that a row is either pending with no decision fields or decided with all of them, but no test proves it.
- **No CI pipeline and no end-to-end tests.** The full workflow was verified manually.

## Important decisions

**Decisions are final in this version.** The requirements ask that a decision be recorded, but do not say whether one can be changed. A decision can only be recorded on a `pending` request; a second attempt returns HTTP 409 and leaves the original untouched. Overwriting without a history table would erase the first outcome and its reasoning, which is the information this application exists to keep. A CHECK constraint enforces the same rule in the database, so a partially decided row cannot exist. The cost is that a reviewer cannot correct a typo or revise a decision — an append-only decisions table with actor and timestamps is the next step.

**Filtering and sorting run on the server.** The frontend sends query parameters, the API validates them, and PostgreSQL performs the filtering and ordering. Every client therefore sees the same queue, and the frontend never implements a second copy of the ordering logic. The status and urgency enums are declared in the order the queue needs, so PostgreSQL's native enum ordering handles the sort without CASE expressions. The costs are one API round-trip per control change, and a queue order coupled to the enum declaration order — a test asserts the exact default order to guard that coupling.

**Backend tests run against real PostgreSQL.** Tests were required, but not what they run against. Mocking the data-access layer would verify no SQL, and SQLite cannot reproduce the PostgreSQL enum ordering the queue sort depends on, so a passing SQLite suite would prove nothing about the ordering. Each test instead opens an outer transaction, hands that session to the application, and rolls the transaction back when the test ends. The costs are a required PostgreSQL container, a more complex fixture than a mock, and a suite that cannot run in parallel against one database.

## Total time spent

6 focused hours.
