# Abgleich: SAP-Datasphere-Handbuch ↔ Datasphere Game

Quelle: Curlins „SAP Datasphere Handbuch“ (docx, 12 Kapitel, Stand 09.10.2026; nicht im Repo).
Das Handbuch markiert 179 Stellen selbst als „nicht verifiziert“. Diese baut das Spiel nur vereinfacht und kennzeichnet sie.

## Deckt das Handbuch alle Spielkapitel ab?

| Spielkapitel | Handbuch | Abgedeckt | Offen / Hinweis |
| --- | --- | --- | --- |
| 0 Find your way | 2 Oberfläche | ja: Zonen, Seitennavigation, Objektlisten, Save/Deploy-Status, Space-Auswahl | Reihenfolge der Navigation „nicht verifiziert“ |
| 1 Space Concept | 4 Space Management | ja: ID-Regeln, Speicher, Priorität, Sharing, Sperre | Prioritätsbereich und Standardspeicher „nicht verifiziert“ (Spiel: 1–5, 2 GB/1 GB laut learning.sap.com) |
| 2 Users & Roles | 3.7 Rollen | Konzept ja (Standard-, Custom-, Scoped Roles) | Namen DW Space Administrator/Integrator/Modeler/Consumer „nicht verifiziert“ |
| 3 Data Integration | 5, 6.4, 6.7, 10 | ja, gebaut am 09.10.2026 | Feature-Matrix je Verbindungstyp und Button-Texte „nicht verifiziert“ |
| 4 Inbound Layer | 6.4, 6.11 | ja (Data Preview, lokale Tabellen) | SQL-Grundlagen kommen nicht aus dem Handbuch |
| 5 Harmonization | 6.5.2, 6.11.4 | ja: SQL Views, Sharing | – |
| 6 Semantics | 6.5.3, 6.5.4, 6.6 | ja: Fact, Dimension, Text, Hierarchy (+ with Directory), Assoziationen, E/R-Modell | Spiel kennt bisher nur Relational Dataset/Fact/Dimension/Text → Hierarchy ergänzen |
| 7 Analytic Model | 6.10 | ja: Kennzahlarten (calculated, restricted, count distinct …), Variablen | – |
| 8 Data Access Controls | 9.3 | ja: Single Values, Operator and Values, Hierarchy, Zuweisung | – |
| 9 Persistence | 6.5.6, 10.3.4 | ja: Persistenz, Partitionierung, View Analyzer | – |
| 10 Operations | 6.7.3, 6.8, 10 | ja: Transformation Flow, Task Chains, Monitor, Benachrichtigungen | – |
| 11 / Exkurse | 7, 8, 11, 12 | ja: Business Builder, Catalog & Marketplace, Transport, Verbrauch | – |

## Widersprüche und offene Punkte (am echten Tenant prüfen)

1. **Data Access Controls:** 2.3.2 listet einen eigenen Navigationseintrag, 9.2 legt DACs im Data Builder an. Spiel: Kachel im Data Builder.
2. **Gruppe „Monitoring“:** 10.2 nennt den Pfad *Monitoring › Data Integration › Flows*. Spiel: Data Integration Monitor oben, System Monitor unten, ohne Gruppe.
3. **Reihenfolge der Seitennavigation:** laut 2.3.2 nicht verifiziert; ändert sich je Release.
4. **Standardrollen:** nur DW Administrator, DW Viewer und Catalog User sind belegt.
5. **Feature-Matrix der Verbindungstypen (5.4.2):** komplett nicht verifiziert; das Spiel nutzt eine vereinfachte Matrix.

## Was Kapitel 3 aus dem Handbuch umsetzt

- Connection gehört genau einem Space, entsteht aus einem Typ; Validate zeigt verfügbare Features (5.1, 5.4.3, 5.4.4)
- On-Premise über Cloud Connector mit Location-ID; TLS braucht Server- oder CA-Zertifikat unter *Configuration › Security* (5.5)
- Remote Tables: Remote vs. Replicated (Snapshot); Steuerung im Data Integration Monitor; Empfehlung „Remote Only + Replication Flow“ (5.6, 6.4.4, 10.3.2)
- Replication Flow: Initial Only / Initial and Delta (nur delta-fähige Quellen), Truncate, Projektion mit Zusatzspalten (6.7.2)
- Monitor: ein Space, Tabs Remote Tables, Local Tables, Views, Flows, Remote Queries, Task Chains; Läufe mit Meldungen; Zeitpläne mit Consent (10.3)
- Space-Sperre bei Speicherüberschreitung, Unlock (4.4.3, 4.4.11); E-Mail-Benachrichtigung bei fehlgeschlagenen Replication Flows (10.3.5)

Nicht simuliert: Real-Time-Replikation, Data Provisioning Agent, Data Flows, Custom Connection Types, Premium Outbound, Cron-Ausdrücke.
