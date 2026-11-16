# SecurityOps 2.0 - Grenzen der Gerätesicherheit

**Aktiver Express-/Browser-Pfad; keine Geräte- oder Datenschutzfreigabe.**

- **IMPLEMENTIERT:** Die Oberfläche filtert dauerhafte lokale Mutationen und
  Anhänge nach Mandant und Besitzer. IndexedDB unterliegt der Same-Origin Policy;
  das ist weder eine Verschlüsselungszusage noch eine Betriebssystem-Benutzertrennung.
- **IMPLEMENTIERT UND GETESTET im beschriebenen Umfang:** Erfolgreiche
  API-Abmeldung widerruft die Serversitzung. Lokale Sitzungs-/Ansichtsdaten
  werden bereinigt; persistierte Outbox-Einträge bleiben ihrem ursprünglichen
  Besitzer zugeordnet und werden nicht als fremdes Konto wiedergegeben.
- **OFFEN:** Registrierung, vertrauenswürdiger Gerätefingerprint und
  gerätebasierte Sync-Sperrung. Der aktive Sync-Controller validiert `deviceId`
  als String, prüft aber keinen Gerätewiderruf. Ein Sitzungswiderruf ist kein
  implementierter Gerätewiderruf. Frühere gegenteilige Beschreibungen waren
  für diesen aktiven Backend-Pfad nicht belegt.
- **NICHT VERIFIZIERT:** Physische Geräte, gemeinsam genutzte Browserprofile,
  MDM, lokale Verschlüsselung und produktive Datenschutz-/Löschvorgaben.

Details: [aktives Sync-Protokoll](./SYNC_PROTOCOL.md) und
[Projektstatus](../PROJECT_CURRENT_STATUS.md).
