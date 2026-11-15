CREATE TABLE guardbook_attachment_idempotency (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key UUID NOT NULL,
    incident_id UUID NOT NULL,
    document_id UUID NOT NULL,
    request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, idempotency_key),
    CONSTRAINT uq_guardbook_attachment_document UNIQUE (tenant_id, document_id),
    CONSTRAINT fk_guardbook_attachment_incident
        FOREIGN KEY (incident_id, tenant_id)
        REFERENCES guardbook_entries(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_guardbook_attachment_document
        FOREIGN KEY (document_id, tenant_id)
        REFERENCES documents(id, tenant_id) ON DELETE RESTRICT
);

ALTER TABLE guardbook_attachment_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardbook_attachment_idempotency FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permissive ON guardbook_attachment_idempotency
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (
        current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid
    )
    WITH CHECK (
        current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid
    );

REVOKE ALL ON guardbook_attachment_idempotency FROM PUBLIC;
GRANT SELECT, INSERT ON guardbook_attachment_idempotency TO secops_app_user;
