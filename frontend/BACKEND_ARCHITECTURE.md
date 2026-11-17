# AlfaSecuritySoft – Backend- und API-Architektur

## Laufzeit und Schichten

Die operative Fach-API liegt in `frontend/backend/src/` und verwendet Express 4, TypeScript und PostgreSQL 16. `app.ts` registriert Authentifizierungs-, Fach- und DMS-Routen; Controller validieren Eingaben mit Zod und rufen Datenbankoperationen über `withTenantTransaction` auf. Der Produktionsprozess verbindet sich ausschließlich als `alfasecuritysoft_app_user`, der über die additive Migration 043 die bestehenden eingeschränkten Grants von `secops_app_user` erbt; Migrationen laufen separat mit der Legacy-Administrationsrolle `secops_admin`.

Die Session-Authentifizierung verwendet ein zufälliges HttpOnly-Cookie. `authenticateJwt` ist aus Kompatibilitätsgründen benannt, prüft aber den Session-Hash in `user_sessions` und lädt Tenant, Rolle sowie Berechtigungen aus der Datenbank. `requirePermission` erzwingt Rechte auf jeder geschützten Route. Die Datenbank setzt `app.current_tenant` pro Transaktion und erzwingt RLS.

## Wachbuchabschluss und Nachträge

`GET /api/v1/logbook` liefert die letzten 100 sichtbaren Einträge einschließlich
`revisions: [{ id, timestamp, authorName, note }]`. Die Nachträge sind nach
Zeit und ID geordnet.
Nur tatsächlich gespeicherte Nachträge werden als Revisionen angezeigt; eine
lokale Erfassung erfindet keinen serverseitigen Ersterfassungs-Nachtrag.

Der Abschluss verwendet die vorhandene dauerhafte IndexedDB-Outbox und
`POST /api/v1/sync/push`, nicht einen zweiten Abschluss-Endpunkt:

```json
{
  "deviceId": "browser-device-id",
  "mutations": [{
    "clientUuid": "queue-stable-mutation-id",
    "entityType": "guardbook",
    "action": "UPDATE",
    "clientTimestamp": "2026-11-16T12:00:00.000Z",
    "baseVersion": 1,
    "payload": {
      "entryId": "11111111-1111-4111-8111-111111111111",
      "stage": "Abgeschlossen",
      "correctionNote": "Tatsächlicher Abschluss nach Prüfung."
    }
  }]
}
```

`entryId` ist die ursprüngliche UUID. Ein angegebener Korrekturvermerk muss
getrimmt mindestens fünf Zeichen enthalten. Zulässige Stufen sind `Erfasst`,
`In Bewertung`, `Zugewiesen`, `Maßnahme läuft`, `Eskaliert`, `Abgeschlossen`
und `Archiviert`. Ungültige Änderungen werden als `REJECTED` zurückgegeben.
Nachtrag, Statusänderung und idempotente Quittung laufen in derselben
Tenant-Transaktion. `resolved` wird aus der validierten Stufe abgeleitet:
Abgeschlossen/Archiviert setzen es auf `true`, die anderen Stufen auf `false`.
Der Nachtragsautor stammt aus der authentifizierten Sitzung, nicht dem Payload.
Wiederholte identische Mutationen erzeugen keinen zweiten Nachtrag.

Die UI bestätigt zunächst nur dauerhafte lokale Speicherung. Bis zur
Serverquittung bleibt der bisherige Serverstatus maßgeblich; Fehler und
ausstehende Änderungen sind im Center beziehungsweise der Warteschlange
sichtbar. Erst der bestätigte, neu geladene Serverstand zeigt „Erledigt“.
`logbook:read`, die bestehende `logbook:create`-/Standortprüfung beim Sync,
Tenant-Kontext und RLS bleiben maßgeblich. Das ist keine vollständig
abgenommene Rollen-/Objektmatrix oder rechtliche Revisionssicherheitszusage.

## DMS-Datenfluss

1. Das DMS-Modul sendet einen binären Online-Upload (`application/octet-stream`) mit Dateiname als Metadatum; es besitzt keine allgemeine Offline-Binärdateisynchronisation. Davon getrennt speichert das Wachbuch ownergebundene Offline-Fotoanhänge in IndexedDB und überträgt sie später über seinen idempotenten Anhangpfad.
2. Der Server validiert Dateigröße, Dateiendung **und** Signatur/Formatinhalt (bei OOXML zusätzlich ZIP-Verzeichnis, CRC, Content-Type und Haupteintrag). Browser-MIME-Angaben werden nicht vertraut.
3. Ein zufällig generierter UUID-Speicherschlüssel adressiert ein privates Objekt im konfigurierten S3-kompatiblen Bucket. Originaldateinamen werden ausschließlich als Metadaten gespeichert.
4. PostgreSQL-Transaktionen legen Dokument, Version, Zuordnung und Audit-Einträge atomar an. Dateien werden vor dem Commit geschrieben und bei Fehlern best-effort entfernt; unerreichbare Dateien sind keine Downloadobjekte, da Downloads zuerst eine tenant-gefilterte DB-Version auflösen.
5. Versionen sind unveränderlich. Wiederherstellung erzeugt eine neue Versionsnummer, die denselben unveränderlichen Blob referenzieren kann. Archivierung ist soft-delete; ältere Versionen bleiben erhalten.

## DMS-Tabellen und Tenant-Isolation

Migration `012_document_management.sql` führt Kategorien, Ordner, Dokumente, Versionen, Beziehungen, Schlagwörter, Zuweisungen und Audit-Ereignisse ein. Sämtliche DMS-Tabellen haben erzwungenes RLS. Beziehungen zu Kunden, Objekten, Mitarbeitern, Schichten und Wachbuchereignissen verwenden zusammengesetzte Fremdschlüssel mit `tenant_id`; ein ID-Wert allein reicht daher nicht, um einen fremden Mandantendatensatz zu verknüpfen.

Audit-Ereignisse sind für die Anwendungsrolle nur les- und anlegbar. Ein Trigger weist Updates und Deletes zurück. `DELETE /api/v1/documents/:id/files` entfernt mit `documents:archive` die Dateiobjekte eines archivierten Dokuments; Metadaten und Audit bleiben bestehen. Migration 036 und die Storage-Deletion-Outbox behandeln fehlgeschlagene Objektlöschungen. Automatische tenantbezogene Aufbewahrungsregeln sind nicht implementiert.

## Dienstanweisungen (SOP)

Migration `013_sop_instructions.sql` ergänzt tenantgebundene Dienstanweisungen, unveränderliche Versionen und Workflowereignisse sowie Ziel- und Mitarbeiterzuweisungen. Migration `014_employee_site_assignments.sql` ergänzt eine explizite, tenantgebundene Mitarbeiter-/Objektzuordnung und übernimmt vorhandene Zuordnungen aus Schichten. Alle SOP- und Zuordnungstabellen erzwingen RLS. Versions- und Auditdatensätze sind für die Anwendungsrolle nicht änder- oder löschbar; bestätigte Zuweisungen sind append-only. Objekt- und Kundenziele werden aus den expliziten Objektzuordnungen zu aktiven Mitarbeitern aufgelöst, unabhängig von zukünftigen Schichten.

Die API erzwingt die Berechtigungen `sop:*` und den Ablauf Entwurf → Prüfung → Freigabe → Veröffentlichung. Ersteller und Einreicher der konkreten Version dürfen diese nicht prüfen oder freigeben; der Prüfer darf dieselbe Version nicht freigeben. Bestätigungen werden dem authentifizierten Konto und einer konkreten SOP-Version zugeordnet. Der SOP-Datensatz kann tenantgebunden auf ein vorhandenes DMS-Dokument verweisen; Dateien werden nicht dupliziert. Offline-Bestätigungen werden im `sopAcknowledgements`-Store der vorhandenen IndexedDB vorgemerkt und erst nach serverseitiger Bestätigung als abgeschlossen behandelt. Erinnerungen werden beim Abruf berechnet; es gibt keinen zeitgesteuerten Scheduler oder automatische Eskalationszustellung.

## Übergabemanagement

Migration `017_handover_management.sql` ergänzt tenantgebundene Übergaben, Teilnehmer, Bestätigungen, Aufgaben und DMS-Verknüpfungen. Die davor liegenden Migrationen 015/016 gehören zum inzwischen integrierten Alarmmodul. Alle sieben Übergabetabellen erzwingen RLS, nutzen zusammengesetzte Tenant-FKs und erhalten nur die für den Anwendungsbetrieb erforderlichen Rechte. Bestätigungen, Teilnehmer, Dokumentverknüpfungen sowie Ereignis- und Aufgabenhistorien sind append-only. Ein bestätigter Übergabeinhalt kann nicht aktualisiert werden; eine Korrektur wird als separates Ereignis protokolliert.

Die Übergabe-API verwendet `handovers:*`-RBAC und den Statusfluss `pending_handover_confirmation` → `pending_takeover_acknowledgement` → `completed`. Bestätigen darf nur das zugeordnete Mitarbeiterkonto. Bearbeitungen vor der Bestätigung sind versionsgeprüft; Aufgabenänderungen ebenso. Offene Aufgaben bleiben dem Ursprungsprotokoll und Objekt zugeordnet und werden bei Folgeübergaben am selben Objekt angezeigt. DMS-Dateien werden nicht kopiert, sondern über einen tenantgebundenen FK verknüpft. Synchronisierte Erfassungen laufen über die bestehende `sync_idempotency_receipts`-Tabelle und die IndexedDB-Outbox. Es gibt keine konfigurierte E-Mail-/Push-Zustellung; der Status wird in der Oberfläche angezeigt.

## REST-API

Die Fachpfade haben das Präfix `/api/v1` und benötigen eine gültige Sitzung. Health, Login und Abschluss eines Passwort-Resets sind explizite öffentliche Ausnahmen. Die Request-/Response-Verzeichnisse sowie Berechtigungen stehen in [DOCUMENTS_API.md](./DOCUMENTS_API.md), [SOP_API.md](./SOP_API.md), [HANDOVERS_API.md](./HANDOVERS_API.md) und [PATROL_MANAGEMENT.md](./PATROL_MANAGEMENT.md). Aktive Module, Tests und Grenzen stehen in der [Implementierungsmatrix](../MODULE_IMPLEMENTATION_STATUS.md).

Die schreibgeschützte UI-Konsole verwendet den bestehenden API-Client und nur
`GET /auth/me`, `GET /customers` und `GET /logbook`. Sie zeigt tatsächliche
Antwortdaten oder Fehler, keine generierten Tokens, Python-Testläufe oder
RLS-Nachweise. Die Kundenliste liefert bewusst keine `tenant_id`; der
Mandantenkontext stammt aus der authentifizierten Transaktion. Eine echte
Browserregression vergleicht API-/UI-Daten und prüft eine tatsächliche
Reader-Ablehnung. Der Abnahme-Prüfplan startet keine Tests und erteilt keine
Produktionsfreigabe. Der generische Automationseditor besitzt keine
serverseitige Persistenz oder Engine; die vorhandenen Alarm-/Patrolworker sind
gesonderte implementierte Fachabläufe, keine generische Regelengine.

## Kontrollgänge und Patrol-Sync

`patrolController.ts` registriert Objekt-/Tenant-gebundene Kontrollpunkte, versionierte Routen, Rundgänge, Scans, Abweichungen und Auditereignisse. Die API prüft serverseitig granulare Patrol-Rechte (u. a. checkpoint-/route-Manage, Rundgangstart/-durchführung/-abschluss, Historie und Auswertung); die bisherigen groben Rechte bleiben kompatible Alternativen. `withTenantTransaction` setzt den Tenant-Kontext für RLS. Die Mitarbeiteridentität kommt aus `employees.account_user_id` plus aktiver `employee_site_assignments`-Zuordnung.

Direkte und synchronisierte Rundgangsstarts/-abschlüsse rufen dieselben idempotenten Persistenzfunktionen auf. Der Sync speichert Mutation, Payload-Hash und Serverquittung in derselben Tenant-Transaktion; unerwartete Serverfehler werden nicht als fachliche Ablehnung verschluckt. Scan-GPS und Abschlussbemerkungen werden mit den Ereignissen gespeichert. Der Server erzeugt idempotente Abweichungen für verspätete Scans, fällige ausgelassene Routenschritte und Abschluss über der konfigurierten Soll-Dauer. Ungültige und doppelte Scans werden ohne Tokengeheimnis tenant-scoped protokolliert. Routenversionen speichern Zeitfenster, tägliche/wöchentliche Wiederholungen, individuelle Mitarbeiter und versionierte Gruppen-Snapshots. `patrolScheduleWorker.ts` materialisiert eindeutige Zeitvorkommen und verarbeitet verpasste/abgebrochene Runden mit Zustandsbedingungen und `SKIP LOCKED`; Ereignisse und Abweichungen werden als technische, tenant-scoped Datensätze persistiert, was keine rechtliche Revisionssicherheitsbewertung darstellt. Der bestehende DMS stellt die Online-Verknüpfung von Dokumenten bereit, nicht aber Offline-Fotoaufnahme oder Binär-Uploads. Konflikte lassen sich serverseitig entweder zugunsten des Serverstands schließen oder als tokenfreie, neue Abweichung dokumentieren; alle Entscheidungen sind tenant-scoped, RBAC-geprüft und idempotent. Es ist kein Patrol-E-Mail-/Push-/Leitstellenprovider konfiguriert; sichtbare Abweichungen/Vorkommensstatus sind kein Zustellnachweis. Siehe [PATROL_MANAGEMENT.md](./PATROL_MANAGEMENT.md).

## Alarm- und Notfallmanagement

Migration `015_alarm_emergency_management.sql` stellt die Grundtabellen bereit; `016_alarm_lifecycle_and_offline.sql` ergänzt tenantgebundene Alarmarten, Notfallkontakt- und Planversionen, Zuweisungen, Status-/Maßnahmenhistorien, Eskalationsregeln/-jobs, Benachrichtigungsstatus und Idempotenzquittungen. Neue Tabellen erzwingen RLS. Planversionen, Aktionen und Statushistorie sind für die Anwendungsrolle append-only; der API-Workflow verwendet zusätzlich zusammengesetzte Tenant-FKs und Revisionen.

`alarmWorkflowController.ts` prüft serverseitig RBAC und den Objektzugriff anhand `employee_site_assignments` (über die angemeldete Benutzer-E-Mail). Nur definierte übergeordnete Rollen erhalten tenantweiten Site-Scope. Kontaktabfragen benötigen ein eigenes Kontakt-Leserecht; Planversionsantworten enthalten ohne dieses Recht keine Kontaktsnapshots. Nicht aktive Kunden/Objekte können keine neuen Pläne oder Vorfälle erhalten.

`alarmEscalationWorker.ts` verarbeitet fällige Jobs regelmäßig mit `FOR UPDATE SKIP LOCKED`, Leasing, begrenzten Wiederholungen und verzögertem Retry. In-App-Mitteilungen werden als Datenbankzustellung gespeichert. E-Mail und Push bleiben sichtbar `not_configured`, bis ein echter Provider eingerichtet ist. Der Worker wird mit dem Backendprozess gestartet und beim Herunterfahren gestoppt; er ersetzt keinen externen hochverfügbaren Job-Queue-Dienst.

Offline-Mutationen werden zuerst in der bestehenden IndexedDB gespeichert und danach direkt oder über `/alarms/sync` mit denselben Mutation-IDs übertragen. Konflikte sind explizit und werden nicht als bestätigt dargestellt. Details der Routen und bekannten Grenzen stehen in [ALARM_EMERGENCY_API.md](./ALARM_EMERGENCY_API.md).

## Betrieb

Die Standard-Dateigröße beträgt 10 MiB und ist über `DMS_MAX_FILE_SIZE_BYTES` bis maximal 100 MiB konfigurierbar. Binärdateien liegen in einem privaten S3-kompatiblen Bucket mit generierten Objektschlüsseln unter `quarantine/`; direkte öffentliche Downloads sind nicht vorgesehen. Migration 035 verwaltet Prüfstatus, Freigabezeitpunkt und Dateilöschung. Die ClamAV-Schnittstelle unterscheidet saubere, infizierte, nicht verfügbare und fehlgeschlagene Prüfungen. Bei verpflichtender Prüfung bleibt jede nicht erfolgreich geprüfte Datei gesperrt. Produktion benötigt einen HTTPS-S3-Endpunkt und einen erreichbaren ClamAV-Dienst; lokales MinIO/ClamAV steht in `deploy/docker-compose.minio.yml`.

Der tägliche verschlüsselte Backup-Dienst sichert PostgreSQL-Metadaten. Objektspeicher-Backups, Versionierung und Retention werden separat beim gewählten S3-kompatiblen Anbieter konfiguriert. DMS-Dateizugriff und Änderungen sind online erforderlich.

## DMS-Beziehungen

Die DMS-Beziehungstabelle akzeptiert nur vorhandene, tenantgebundene Backend-Entitäten; SOPs sind kein polymorpher Beziehungstyp. Stattdessen verweist eine Dienstanweisung über eine tenantgebundene Fremdschlüsselspalte auf ein vorhandenes DMS-Dokument. Alarmmaßnahmen können ein vorhandenes tenantgebundenes DMS-Dokument referenzieren; ein Offline-Datei-Upload für Alarme ist nicht implementiert.
