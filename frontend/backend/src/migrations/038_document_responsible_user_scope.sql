CREATE OR REPLACE FUNCTION prevent_unscoped_document_owner_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.responsible_user_id IS NOT NULL
       AND (
           TG_OP = 'INSERT'
           OR NEW.responsible_user_id IS DISTINCT FROM OLD.responsible_user_id
       )
       AND NEW.responsible_user_id IS DISTINCT FROM
           NULLIF(current_setting('app.current_user_id', true), '')::uuid
       AND NOT app_request_scope_allows(NULL, NEW.responsible_user_id)
    THEN
        RAISE EXCEPTION 'Das Setzen des Verantwortlichen überschreitet den eigenen Berechtigungsumfang.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION prevent_unscoped_document_owner_assignment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prevent_unscoped_document_owner_assignment() TO secops_app_user;

CREATE TRIGGER trg_documents_responsible_user_scope
BEFORE INSERT OR UPDATE OF responsible_user_id ON documents
FOR EACH ROW EXECUTE FUNCTION prevent_unscoped_document_owner_assignment();
