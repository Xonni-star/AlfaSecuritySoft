CREATE OR REPLACE FUNCTION app_document_relationship_in_scope(
    requested_document_id UUID,
    requested_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM document_relationships relationship
         WHERE relationship.document_id = requested_document_id
           AND relationship.tenant_id = requested_tenant_id
           AND (
               app_request_scope_allows(relationship.site_id, NULL)
               OR EXISTS (
                   SELECT 1 FROM sites site
                    WHERE site.client_id = relationship.customer_id
                      AND site.tenant_id = relationship.tenant_id
                      AND app_request_scope_allows(site.id, NULL)
               )
               OR EXISTS (
                   SELECT 1 FROM employee_site_assignments assignment
                    WHERE assignment.tenant_id = relationship.tenant_id
                      AND assignment.employee_id = relationship.employee_id
                      AND app_request_scope_allows(assignment.site_id, NULL)
               )
               OR EXISTS (
                   SELECT 1 FROM shifts shift
                    WHERE shift.id = relationship.shift_id
                      AND shift.tenant_id = relationship.tenant_id
                      AND app_request_scope_allows(shift.site_id, NULL)
               )
               OR EXISTS (
                   SELECT 1 FROM guardbook_entries entry
                    WHERE entry.id = relationship.incident_id
                      AND entry.tenant_id = relationship.tenant_id
                      AND app_request_scope_allows(entry.site_id, NULL)
               )
           )
    )
$$;

REVOKE ALL ON FUNCTION app_document_relationship_in_scope(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_document_relationship_in_scope(UUID, UUID) TO secops_app_user;

DROP POLICY app_request_scope ON documents;
CREATE POLICY app_request_scope ON documents AS RESTRICTIVE FOR ALL
USING (
    app_request_scope_allows(site_id, responsible_user_id)
    OR app_document_relationship_in_scope(id, tenant_id)
)
WITH CHECK (
    app_request_scope_allows(site_id, responsible_user_id)
    OR app_document_relationship_in_scope(id, tenant_id)
);
