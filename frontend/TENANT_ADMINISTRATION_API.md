# System-wide tenant administration API

System tenant administration is separate from changing the active tenant session and from the tenant-scoped `/api/v1/admin/users` and `/api/v1/admin/roles` APIs.

## Authorization boundary

All routes require an authenticated session whose database account has `users.is_superadmin = true`. Tenant permissions such as `users:manage`, `roles:manage`, or `roles:delegate_admin`, and a role's display name, do not grant system tenant administration. The backend enforces this at the route and controller layers.

Operations run in a system transaction because they manage the global `tenants` registry. The selected tenant still comes exclusively from the authenticated session for all ordinary business APIs; system-administrator status does not bypass tenant-scoped resource permissions. Tenant creation and updates write an audit event into the affected tenant's `audit_logs` table. Tenant deactivation is a soft status change; tenant data is not deleted.

## Routes

| Method and path | Behavior |
|---|---|
| `GET /api/v1/system/tenants` | List global tenant metadata. System administrators only. |
| `POST /api/v1/system/tenants` | Create an active tenant. |
| `PATCH /api/v1/system/tenants/:id` | Update supplied tenant fields or activate/deactivate a tenant. |

Creation requires `name`, `subdomain`, `taxNumber`, `licenseTier`, `bwrRegisterId`, and `din77200Certified`. License values are `ENTERPRISE`, `PROFESSIONAL`, and `STANDARD`; subdomains are normalized to lowercase and validated. Updates accept a non-empty subset of those fields plus `isActive`. Duplicate unique values return `409`; invalid input returns `400`; a missing tenant returns `404`.

The UI labels the DIN 77200 flag as an *indication*. It is not evidence that a certification has been independently verified and is not a compliance determination.

## Explicit non-goals

- These endpoints do not create tenant users, memberships, roles, or permissions.
- They do not switch or rebind the current session to another tenant. The header displays the tenant selected by the authenticated session; a future tenant-switch flow must validate membership server-side.
- They do not hard-delete tenants or cascade-delete tenant data.
- They do not establish production deployment, tenant onboarding, external-provider setup, or legal/customer acceptance.
