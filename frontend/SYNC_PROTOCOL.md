# AlfaSecuritySoft - Aktives Synchronisationsprotokoll

## Push - IMPLEMENTIERT UND GETESTET im beschriebenen Umfang

`POST /api/v1/sync/push` verwendet die bestehende Session-/CSRF-
Authentifizierung. Der Request enthält `deviceId` und `mutations`; jede
Mutation enthält `clientUuid`, `entityType`, `action`, `clientTimestamp`,
`baseVersion` und `payload`. Antworten liefern pro Mutation eine Quittung
mit derselben `clientUuid`, Status und gegebenenfalls Server-ID/-Version.
Eine erfolgreiche HTTP-Antwort allein bestätigt nicht jede Mutation.

- **Idempotenz:** Mandantengebundene `sync_idempotency_receipts`,
  Payload-Hash und transaktionale Advisory Locks verhindern für die geprüften
  Mutationen doppelte Effekte. Eine geänderte Wiederverwendung ist kein Erfolg.
- **Mandant und Objekt:** Der Mandant stammt aus `req.user.tenantId`, nicht
  aus dem Payload. Rechte und gespeicherter Site-Bezug werden serverseitig
  auch vor dem Replay geprüft; bei Standortwechseln müssen Ausgangs- und
  Zielobjekt freigegeben sein. Die Transaktion verwendet den PostgreSQL-
  Mandanten-/RLS-Kontext. Nicht site-gebundene Entitäten benötigen Tenant-Grants.
- **Gerätekennung:** `deviceId` wird als String validiert. Der aktive
  Push-Controller implementiert damit weder einen vertrauenswürdigen
  Gerätefingerprint noch eine registrierungsbasierte Gerätewiderrufsprüfung.
  Solche Funktionen sind **OFFEN**, kein vorhandener Sicherheitsnachweis.
- **Spezialisierte Mutationen:** Der Frontend-Sync verwendet unter anderem
  `/handovers/sync`, `/patrol/sync`, `/customers/sync`, `/sites/sync` und
  `/employees/sync`; SOP-Kenntnisnahmen und Alarmmutationen haben eigene Pfade.

## Client-Zyklus und Wiederholungen

Die generische Outbox ist an Mandant und Benutzer gebunden. `SYNCED` entfernt
die Mutation erst nach passender Quittung; Konflikte und Fehler bleiben lokal.
Retry-Fristen gelten je Mutation. Nach Verlust einer echten Zweier-Quittung
darf ein Retry daher nur eine der inzwischen fälligen Mutationen enthalten.
Jede ursprüngliche UUID und ihre identische Server-ID müssen dennoch
vollständig wiedergefunden werden; eine feste Retry-Batchgröße ist kein Vertrag.

Die Laufzeitsperre und `isSyncing` werden erst im zentralen `finally` des
gesamten Zyklus freigegeben, auch bei leerer Queue und nachfolgender
Datenaktualisierung. Weitere Auslöser merken einen Folgezyklus vor. Diese
Sperre gilt innerhalb eines App-Runtimes, nicht über Browser-Tabs oder Geräte.
Backend-Idempotenz bleibt unabhängig davon erforderlich.

## Pull - GEPLANT / OFFEN

Das aktive Express-Backend registriert kein `POST /api/v1/sync/pull`.
Ein sequenzbasiertes Delta-Pull mit `since_sequence` ist nicht implementiert.
`loadTenantData` aktualisiert stattdessen berechtigungsabhängig die vorhandenen
Modul-GET-Endpunkte. Das ist keine geräteübergreifende Vollreplikation oder
garantierte Hintergrundausführung nach dem Schließen des Browsers.

Aktuelle Prüfstände und Grenzen: [Projektstatus](../PROJECT_CURRENT_STATUS.md).
