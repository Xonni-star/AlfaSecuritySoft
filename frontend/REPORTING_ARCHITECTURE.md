# Berichtswesen: Implementierungsstand

**Status:** TEILWEISE IMPLEMENTIERT. Diese Datei beschreibt den vorhandenen technischen Umfang, nicht eine fachliche Abnahme oder Produktionsfreigabe. Die zuvor beschriebenen Compliance-Indizes, umfassenden Controlling-Dashboards und PDF-Exporte sind keine nachgewiesenen Funktionen und werden nicht als verfügbar dargestellt.

## Datenfluss und Berechtigungen

Die Planungsberichte laufen über authentifizierte `/api/v1/planning/reports/*`-Routen. Jede Route verlangt serverseitig `planning:reports:read`; die Mandanten-ID stammt aus der validierten Sitzung. Tenant-weite Grants dürfen mandantenweite Berichte lesen. Standort-Grants müssen auf die vom angemeldeten Benutzer erhaltenen Standort-IDs begrenzt werden; die Frontend-Sichtbarkeit ist keine Sicherheitsgrenze.

Die vier API-Berichte liefern Arbeitsstunden (JSON und CSV), Schichtabdeckung, Qualifikationsangebot/-bedarf und Abwesenheiten. Arbeitsstunden und Abdeckung beziehen ihre Standortgrenze aus den Schichten; Qualifikationsangebot wird auf Mitarbeiter mit Standortzuweisung begrenzt und der Bedarf auf Schichten an erlaubten Standorten; Abwesenheiten und ihre Aggregate werden auf Mitarbeiter mit Standortzuweisung begrenzt. Der CSV-Export verwendet denselben serverseitigen Arbeitszeitbericht.

## Nachweisgrenzen

Der aktuelle lokale Worktree enthält explizite Standortfilter für diese Abfragen und einen PostgreSQL-Integrationstest für Standortgrenzen und fehlende Berechtigungen. Der Backend-TypeScript-Build und die PostgreSQL-gestützte Regression-Suite `sync_and_roles.test.ts` (33/33 Tests) bestanden gegen eine isolierte PostgreSQL-16-Testdatenbank. Hosted CI und Produktionsabnahme für diesen Worktree stehen noch aus; dies ist keine umfassende Sicherheitsprüfung, Zertifizierung, Rechtskonformitäts-, Revisionssicherheits- oder Mandantentrennungsabnahme.

Details zu Feldern, Datumsbereichen und CSV-Verhalten: [Service Planning API](./backend/SERVICE_PLANNING_API.md). Der aktuelle Projekt- und GitHub-Status steht in [PROJECT_CURRENT_STATUS.md](../PROJECT_CURRENT_STATUS.md).
