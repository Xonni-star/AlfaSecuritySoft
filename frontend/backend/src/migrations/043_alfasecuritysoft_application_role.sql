-- Add a product-branded login without revoking the legacy role or its grants.
-- Existing DATABASE_URL credentials continue to work during the transition.
DO $$
DECLARE
    app_role record;
    app_role_oid oid;
BEGIN
    SELECT oid INTO app_role_oid
      FROM pg_roles
     WHERE rolname = 'alfasecuritysoft_app_user';

    IF NOT FOUND THEN
        CREATE ROLE alfasecuritysoft_app_user
            WITH LOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
    ELSE
        SELECT rolcanlogin, rolinherit, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
          INTO app_role
          FROM pg_roles
         WHERE oid = app_role_oid;

        IF NOT app_role.rolcanlogin
           OR NOT app_role.rolinherit
           OR app_role.rolsuper
           OR app_role.rolbypassrls
           OR app_role.rolcreaterole
           OR app_role.rolcreatedb THEN
            RAISE EXCEPTION 'Existing alfasecuritysoft_app_user role has unsafe or incompatible attributes.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM pg_auth_members membership
          JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
         WHERE membership.member = app_role_oid
           AND granted_role.rolname <> 'secops_app_user'
    ) THEN
        RAISE EXCEPTION 'Existing alfasecuritysoft_app_user has unexpected role memberships.';
    END IF;
END
$$;

GRANT secops_app_user TO alfasecuritysoft_app_user;
