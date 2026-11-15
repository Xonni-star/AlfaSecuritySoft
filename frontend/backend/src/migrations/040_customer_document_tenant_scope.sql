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
               OR (
                   relationship.relationship_type = 'customer'
                   AND app_request_scope_allows(NULL, NULL)
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

DROP POLICY app_request_scope ON document_relationships;
CREATE POLICY app_request_scope ON document_relationships AS RESTRICTIVE FOR ALL
USING (
    app_request_scope_allows(site_id, NULL)
    OR (
        relationship_type = 'customer'
        AND app_request_scope_allows(NULL, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM employee_site_assignments assignment
         WHERE assignment.tenant_id = document_relationships.tenant_id
           AND assignment.employee_id = document_relationships.employee_id
           AND app_request_scope_allows(assignment.site_id, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM shifts shift
         WHERE shift.id = document_relationships.shift_id
           AND shift.tenant_id = document_relationships.tenant_id
           AND app_request_scope_allows(shift.site_id, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM guardbook_entries entry
         WHERE entry.id = document_relationships.incident_id
           AND entry.tenant_id = document_relationships.tenant_id
           AND app_request_scope_allows(entry.site_id, NULL)
    )
)
WITH CHECK (
    app_request_scope_allows(site_id, NULL)
    OR (
        relationship_type = 'customer'
        AND app_request_scope_allows(NULL, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM employee_site_assignments assignment
         WHERE assignment.tenant_id = document_relationships.tenant_id
           AND assignment.employee_id = document_relationships.employee_id
           AND app_request_scope_allows(assignment.site_id, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM shifts shift
         WHERE shift.id = document_relationships.shift_id
           AND shift.tenant_id = document_relationships.tenant_id
           AND app_request_scope_allows(shift.site_id, NULL)
    )
    OR EXISTS (
        SELECT 1 FROM guardbook_entries entry
         WHERE entry.id = document_relationships.incident_id
           AND entry.tenant_id = document_relationships.tenant_id
           AND app_request_scope_allows(entry.site_id, NULL)
    )
);

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
