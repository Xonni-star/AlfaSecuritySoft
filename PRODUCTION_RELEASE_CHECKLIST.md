# SecurityOps 2.0 — Produktionsfreigabe-Checkliste

**Stand: 16.11.2026. Keine Produktionsfreigabe.**
Nicht gesetzte Haken sind offene Freigabevoraussetzungen. Ein historischer
Test, ein Merge und ein erfolgreiches Containerimage ersetzen sie nicht.

## Bereits belegte technische Grundlagen

- [x] Aktiven React-/Express-/PostgreSQL-Pfad und historischen Python-Pfad getrennt.
- [x] Revisionsgebundene CI-Evidenz dokumentiert; fehlgeschlagene Läufe erhalten.
- [x] Eigene ephemere Browser-/Restore-Umgebungen mit synthetischen Daten geprüft.
- [x] Sechs echte Cookie-/CSRF-/PostgreSQL-Browserjourneys einschließlich
      kritischem Offline-Vorfall mit Folgeaufgabe und verlorenem Serverbeleg.
- [x] Siebte echte Browserjourney für schreibgeschützte API-Daten, exakt erlaubten
      Kunden, echte Reader-Ablehnung und keine Mutationsanforderung.
- [x] Achte echte Browserjourney für bestätigte Mitarbeiter-/Nachweis-/Abwesenheitsdaten,
      nullable Nachweisbearbeitung, echten Konflikt mit erhaltenem Entwurf und
      Kalendertage/abgelaufenen Nachweisstatus nach Reload.
- [x] Neunte echte Browserjourney für Offline-Kundenanlage, tatsächliche Vertragswerte
      und Objektanforderungen nach Änderung/Reload; realer API-/Sync-Nachweis
      für Verlängerung/Kündigungsfrist und unveränderte SLA bei Teiländerung.
- [x] Gefundene simulierte Audit-/Technik-/Abnahmeergebnisse entfernt;
      lokale Automationsentwürfe und fehlende Engine ausdrücklich gekennzeichnet.
- [x] Privaten lokalen S3-/ClamAV-Ablauf, Originalbytes und echte Dateiablehnung geprüft.
- [x] Transaktionalen lokalen Restore, Fehler-/Resume-Pfade und Archivfrische geprüft.

Diese Haken bestätigen nur den beschriebenen Entwicklungsnachweis;
die exakten Revisionen stehen im [Projektstatus](./PROJECT_CURRENT_STATUS.md).

## Vor jeder konkreten Freigabe erneut erforderlich

- [ ] Eindeutigen Release-Commit und Artefaktprüfsummen festlegen; alle erforderlichen
      CI-Jobs auf genau diesem Commit erfolgreich, keine offenen wichtigen Befunde.
- [ ] Erreichbare interne Finalisierungsaufgaben und UI-Simulationen abschließen;
      README, Tracker, API-/Betriebsdokumentation und Releasebeschreibung abgleichen.
- [ ] Repräsentative authentifizierte Rollen-/Standort-/Objektmatrix fachlich abnehmen.
- [ ] Migration/Upgrade und getesteten Rollback-/Restoreplan auf produktionsgleicher
      Umgebung einschließlich DB und Objekten prüfen; keine veröffentlichten
      Migrationsprüfsummen verändern.
- [ ] Effektive RLS-/DB-Rollen, private Buckets, Scanner, Secrets, Proxy/TLS,
      Cookie-/CSRF-/CSP-/Rate-Limit-Konfiguration der Zielumgebung prüfen.
- [ ] Monitoring, externe Alarmierung, Benachrichtigungsprovider und Berechtigungsentzug
      mit positivem und negativem Zustell-/Zugriffsnachweis prüfen.
- [ ] Freigegebenen externen Provider-/Off-host-Restore ausführen und vereinbarte
      RPO/RTO tatsächlich messen; Verantwortliche und Recoveryprotokoll benennen.
- [ ] Physische Android-/iOS-Geräte einschließlich Offline-Neustart, Kontenwechsel,
      SOP, Dateien und Kontrollgänge abnehmen.
- [ ] Unabhängigen Penetrationstest und erforderliche Nachprüfung abschließen.
- [ ] Rechtliche Datenschutz-/Aufbewahrungs-/Betriebsanforderungen konkret freigeben;
      ownerlose Altdaten nicht ohne verifizierte Zuordnung offenlegen.
- [ ] Fachliche und betriebliche Freigabe durch autorisierte Verantwortliche
      dokumentieren; erst danach Deployment und gegebenenfalls Release/Tag auslösen.

**Keine implizite Autorisierung:** Diese Checkliste löst kein Deployment aus und
erteilt keine Produktions-, Zertifizierungs- oder Rechtsfreigabe.
