# Frontend architecture

## Application

The browser application uses React, TypeScript, Vite, and Zustand. Feature modules combine server-backed API operations with local UI state; module persistence and offline capabilities are not uniform. See the [current module status](../README.md), the [system overview](./SYSTEM_OVERVIEW.md), and the [offline architecture](./OFFLINE_ARCHITECTURE.md) for verified scope and limitations.

## API and authentication

`services/apiClient.ts` sends requests with `credentials: 'include'` and attaches the in-memory CSRF token to state-changing requests. It does not use a JWT bearer credential. The selected tenant value stored for UI state is not an authorization boundary; the server resolves tenant and permissions from the authenticated session. See [AUTHENTICATION_SECURITY.md](./AUTHENTICATION_SECURITY.md).

## Local and offline state

IndexedDB stores tenant/user-partitioned offline data and queued mutations for supported workflows. Offline support is feature-specific; a locally queued change is not considered server-persisted or authorized until the API accepts it. The API remains responsible for authorization, tenant/site scope, validation, and idempotent synchronization.

## Technical and acceptance views

The backend console uses the existing API client for a fixed read-only GET
allowlist and binds actual data/errors to the current identity. The architecture
view describes the active Express/TypeScript path, not historical Python code.
The acceptance view is a read-only checklist, not a release or live RLS test.
The audit center labels local/example data and unavailable integrations; the
generic automation editor holds non-persistent local drafts without an execution
engine. Neither view generates successful security or production-acceptance
results. Revision-specific test evidence remains in the project status and CI.
