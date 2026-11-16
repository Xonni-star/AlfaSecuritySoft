# SecurityOps 2.0 — System overview

**Status:** TEILWEISE IMPLEMENTIERT; not approved for production. This overview is based on the current repository structure. Passing CI does not establish operational, legal, or standards conformity.

## Architecture

- `frontend/` contains the React/Vite TypeScript application, Zustand state, IndexedDB-backed offline queues, and Vitest tests.
- `frontend/backend/` contains the Node.js/Express TypeScript API under `/api/v1`, PostgreSQL access, and database migrations.
- PostgreSQL 16+ is used with row-level security on tenant-bound tables. The API derives tenant context from the authenticated session; RLS coverage is table/policy-specific and is not a blanket claim for every historical table.
- Authentication uses opaque, revocable session cookies and Argon2id password hashes. API permissions are checked server-side; UI visibility is not an authorization boundary.

## Implemented module families

The repository includes customer/site and employee administration, shifts and planning, guardbook, keys/tasks, documents, SOPs, alarms/emergency plans, handovers, patrols, and offline synchronization. The exact feature, permission, and offline scope differs by module; see each API contract and the [current project status](../PROJECT_CURRENT_STATUS.md) rather than assuming every UI element has complete persistence or production acceptance.

The planning API currently documents work-hours, coverage, qualification, and absence reports in [SERVICE_PLANNING_API.md](./backend/SERVICE_PLANNING_API.md). The current worktree adds explicit site-grant filtering to those report queries and CSV. The PostgreSQL-backed authorization/sync regression suite passed 33/33 tests against an isolated PostgreSQL 16 database; hosted CI for this worktree has not run.

## Limits and authoritative references

SecurityOps 2.0 is not represented as certified to DIN 77200, BSI, KRITIS, or any law. Process references or operator-entered indicators do not establish conformity. Append-only or versioned records are technical controls, not proof of legal audit immutability.

Use the [README](../README.md), [project completion tracker](../PROJECT_COMPLETION_TRACKER.md), [backend architecture](./BACKEND_ARCHITECTURE.md), and module API documents for current implementation details. Older phase reports are historical snapshots and are not current feature matrices.
