# SecurityOps 2.0 - Phase 6: Konfliktmanagement & Differenzierte Regeln

## 1. Differenzierte Auflösungsregeln
| Entität | Konfliktstrategie | Begründung |
|---|---|---|
| **Wachbuch & Vorfälle** | **Append-Only (Kein Overwrite)** | Anwendungstechnische Integritätsregel: Korrekturen werden als neue Revisionen angehängt, statt bestätigte Einträge zu überschreiben. Daraus wird keine Normen- oder Rechtskonformität abgeleitet. |
| **Aufgaben & Termine** | **Three-Way Merge / Side-by-Side** | Parallele Bearbeitungen zweier Wachleiter werden im Dialog verglichen (Lokale Version vs. Server Version). |
| **Schlüssel** | **Server-Autoritativ (Depot-Status)** | Der physische Schlüsselverbleib im Tresor hat Vorrang vor Offline-Status. |
