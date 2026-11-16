# Reporting test report

**Historical snapshot — not current verification.** The former report's claims about PDF printing, audit-table immutability, tenant aggregation, and report templates were not tied to the current implementation or a reproducible current test run. Do not treat those checks as evidence that these features exist or are production-ready.

The current report API contract is [SERVICE_PLANNING_API.md](./backend/SERVICE_PLANNING_API.md). The current worktree has explicit site-grant filters for all four planning reports and work-hours CSV, plus an API regression test in `frontend/backend/src/tests/sync_and_roles.test.ts`. That PostgreSQL-backed suite passed 33/33 tests against an isolated PostgreSQL 16 database. Hosted CI for this worktree has not run; this result does not establish production readiness.
