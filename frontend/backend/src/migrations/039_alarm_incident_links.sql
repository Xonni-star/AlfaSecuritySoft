ALTER TABLE emergency_management_events
    DROP CONSTRAINT IF EXISTS emergency_management_events_action_check,
    DROP CONSTRAINT IF EXISTS ck_emergency_event_action,
    ADD CONSTRAINT ck_emergency_event_action CHECK (action IN (
        'plan_created', 'plan_updated', 'plan_archived', 'plan_published', 'drill_recorded',
        'incident_reported', 'incident_acknowledged', 'incident_escalated', 'incident_resolved',
        'incident_action_recorded', 'incident_status_changed',
        'incident_responder_assigned', 'incident_responder_unassigned',
        'incident_record_linked'
    ));

CREATE TABLE alarm_incident_links (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alarm_incident_id UUID NOT NULL,
    record_type VARCHAR(16) NOT NULL CHECK (record_type IN ('guardbook', 'handover', 'patrol_round', 'document')),
    guardbook_entry_id UUID,
    handover_id UUID,
    patrol_round_id UUID,
    document_id UUID,
    client_mutation_id VARCHAR(64) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, tenant_id),
    UNIQUE (tenant_id, client_mutation_id),
    CONSTRAINT fk_alarm_link_incident FOREIGN KEY (alarm_incident_id, tenant_id)
        REFERENCES alarm_incidents(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alarm_link_guardbook FOREIGN KEY (guardbook_entry_id, tenant_id)
        REFERENCES guardbook_entries(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alarm_link_handover FOREIGN KEY (handover_id, tenant_id)
        REFERENCES handovers(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alarm_link_patrol_round FOREIGN KEY (patrol_round_id, tenant_id)
        REFERENCES patrol_rounds(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alarm_link_document FOREIGN KEY (document_id, tenant_id)
        REFERENCES documents(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT ck_alarm_link_target CHECK (
        (record_type = 'guardbook' AND guardbook_entry_id IS NOT NULL AND handover_id IS NULL AND patrol_round_id IS NULL AND document_id IS NULL)
        OR (record_type = 'handover' AND guardbook_entry_id IS NULL AND handover_id IS NOT NULL AND patrol_round_id IS NULL AND document_id IS NULL)
        OR (record_type = 'patrol_round' AND guardbook_entry_id IS NULL AND handover_id IS NULL AND patrol_round_id IS NOT NULL AND document_id IS NULL)
        OR (record_type = 'document' AND guardbook_entry_id IS NULL AND handover_id IS NULL AND patrol_round_id IS NULL AND document_id IS NOT NULL)
    )
);
CREATE UNIQUE INDEX uq_alarm_link_guardbook
    ON alarm_incident_links (tenant_id, alarm_incident_id, guardbook_entry_id)
    WHERE guardbook_entry_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alarm_link_handover
    ON alarm_incident_links (tenant_id, alarm_incident_id, handover_id)
    WHERE handover_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alarm_link_patrol_round
    ON alarm_incident_links (tenant_id, alarm_incident_id, patrol_round_id)
    WHERE patrol_round_id IS NOT NULL;
CREATE UNIQUE INDEX uq_alarm_link_document
    ON alarm_incident_links (tenant_id, alarm_incident_id, document_id)
    WHERE document_id IS NOT NULL;

ALTER TABLE alarm_incident_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarm_incident_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permissive ON alarm_incident_links
    AS PERMISSIVE FOR ALL TO PUBLIC
    USING (current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (current_setting('app.current_tenant', true) IS NOT NULL
        AND current_setting('app.current_tenant', true) <> ''
        AND tenant_id = current_setting('app.current_tenant', true)::uuid);
GRANT SELECT, INSERT ON alarm_incident_links TO secops_app_user;
