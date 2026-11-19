-- Device lifecycle foundation (Gerätewiderruf).
-- Adds a tenant-scoped device registry and links each session to a client
-- device_id so an administrator can revoke a device and invalidate all of its
-- sessions in one atomic operation. The existing session "revoked" flag and the
-- authentication middleware already reject revoked sessions; this migration only
-- provides the durable device record and the session<->device link.
ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_user_sessions_device
    ON user_sessions (tenant_id, device_id)
    WHERE device_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS devices (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(128) NOT NULL,
    device_name VARCHAR(150),
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, tenant_id),
    CONSTRAINT uq_devices_tenant_device UNIQUE (tenant_id, device_id)
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permissive ON devices
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid);

GRANT SELECT, INSERT, UPDATE ON devices TO secops_app_user;
GRANT UPDATE (device_id) ON user_sessions TO secops_app_user;
