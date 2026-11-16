CREATE OR REPLACE FUNCTION prevent_guardbook_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Löschen von Einträgen in guardbook_entries wird durch die technische Append-Only-Regel verhindert.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.entry_timestamp != NEW.entry_timestamp OR
           OLD.category != NEW.category OR
           OLD.title != NEW.title OR
           OLD.description != NEW.description OR
           OLD.guard_id != NEW.guard_id OR
           OLD.site_id != NEW.site_id OR
           OLD.tenant_id != NEW.tenant_id OR
           OLD.client_mutation_id IS DISTINCT FROM NEW.client_mutation_id THEN
            RAISE EXCEPTION 'Nachträgliche Manipulation von Kernfeldern im Wachbuch ist verboten. Nutzen Sie guardbook_revisions.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
