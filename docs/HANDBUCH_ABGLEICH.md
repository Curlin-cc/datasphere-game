# Abgleich: SAP-Datasphere-Handbuch ↔ Datasphere Game

Quelle: Curlins „SAP Datasphere Handbuch“ (12 Kapitel, Stand 09.10.2026), im Repo unter `docs/handbuch/`.
Das Handbuch markiert 179 Stellen selbst als „nicht verifiziert“. Diese baut das Spiel nur vereinfacht und kennzeichnet sie.

## Deckt das Handbuch alle Spielkapitel ab?

| Spielkapitel | Handbuch | Abgedeckt | Offen / Hinweis |
| --- | --- | --- | --- |
| 0 Find your way | 2 Oberfläche | ja: Zonen, Seitennavigation, Objektlisten, Save/Deploy-Status, Space-Auswahl | Reihenfolge der Navigation „nicht verifiziert“ |
| 1 Space Concept | 4 Space Management | ja: ID-Regeln, Speicher, Priorität, Sharing, Sperre | Prioritätsbereich und Standardspeicher „nicht verifiziert“ (Spiel: 1–5, 2 GB/1 GB laut learning.sap.com) |
| 2 Users & Roles | 3.7 Rollen | Konzept ja (Standard-, Custom-, Scoped Roles) | Namen DW Space Administrator/Integrator/Modeler/Consumer „nicht verifiziert“ |
| 3 Data Integration | 5, 6.4, 6.7, 10 | ja, gebaut am 09.10.2026 | Feature-Matrix je Verbindungstyp und Button-Texte „nicht verifiziert“ |
| 4 Inbound Layer | 6.4, 6.11 | ja (Data Preview, lokale Tabellen) | SQL-Grundlagen kommen nicht aus dem Handbuch |
| 5 Harmonization | 6.5.2, 6.11.2, 6.11.4 | ja, gebaut am 09.10.2026: SQL Views, Sharing, Impact and Lineage (vereinfacht) | Lineage-Diagramm im Handbuch ohne Details; Spiel zeigt nur Liste im Properties-Panel |
| 6 Semantics | 6.4.1, 6.5.3, 6.5.4, 6.6 | ja, gebaut am 09.10.2026: Semantic Usage inkl. Hierarchy, Key/Attribute/Measure, Associations mit Key-Mapping | Hierarchy with Directory, Analytical Dataset, semantische Spaltentypen (Betrag mit Währung …), E/R-Modell und Kardinalitäten nicht simuliert |
| 7 Analytic Model | 6.10, 6.12.5 | ja, gebaut am 09.10.2026: genau ein Fact, Dimensionen aus Associations, Fact Source / Calculated / Restricted / Count Distinct Measures, Filter Variable (Single Value, Interval, Pflicht/optional), Data Preview mit Zeilen, Measures, Variablenwerten | Fixed Value, Währungs-/Einheitenumrechnung, Ausnahmeaggregation, Skalierung, Sichtbarkeit, globaler Filter, mehrstufige Dimensionen, Standard-/Restricted-Measure-/Stichtagsvariable nur erklärt (teils „nicht verifiziert“) |
| 8 Data Access Controls | 9.3, 9.9, 6.5.7 | ja, gebaut am 09.10.2026: Berechtigungsentität (lokale Tabelle mit Data Editor), Single Values, Identifier/Criteria, Zuweisung mit Spalten-Mapping, Prüfen als Testbenutzer („View as“) | Operator and Values (nicht verifiziert) und Hierarchy nur erklärt; BW-Import, Custom Application Attributes nicht simuliert; Wirkung auf nachgelagerte Views vereinfacht |
| 9 Persistence | 6.5.6, 10.3.4, 10.4, 9.3.7 | ja, gebaut am 09.10.2026: Expensive Statement Tracing (System › Configuration › Monitoring), Expensive Statement Logs, Views-Monitor (Start Data Persistence, Remove Persisted Data, Schedule, Läufe mit Meldungen), View Analyzer (vereinfacht), Grenze „liest View mit DAC“ | Partitionierung und Spalten des Views-Monitors „nicht verifiziert“ (Partitionierung nur erklärt); Laufzeiten simuliert; ob ein View mit eigener DAC persistierbar ist, nicht belegt (Spiel: ja) |
| 10 Operations | 6.7.3, 6.8, 10.3.6, 10.3.8, 10.5, 10.6 | ja, gebaut am 09.10.2026: Task Chains (Replication Flow nur Initial Only, View-Persistenz, Remote-Table-Snapshot, verschachtelte Ketten, geteilte Ketten anderer Spaces), E-Mail-Benachrichtigung, Run/Schedule im Editor und im Monitor, Task-Chains-Monitor mit Schritten und Sprung in den Detailmonitor (Ablauf C), Task Logs über alle Spaces | Parallele Zweige (ALL/ANY) nur erklärt; Transformation Flow, Pause/Fortsetzen, Cron, Cloud ALM nicht simuliert; geteilte (globale) Task Chains laut valantic-Jahresrückblick 2024, nicht im Handbuch |
| 11 Board request | alle bisherigen | ja, gebaut am 09.10.2026: Änderung eines deployten Facts mit Impact auf das Modell, DAC-Vererbung, Persistenz und Nachtkette im Zusammenspiel | Zeitdimension (Space Management) nur erwähnt |
| 12 Exkurse | 12, 11, 8, 7 | ja, gebaut am 09.10.2026: Expose for Consumption + Datenbankbenutzer (12.3, 12.6), Pakete mit erforderlichen Paketen, Export, Import-Optionen, Monitor (11.4, 11.5 A), Katalog mit Assets, Beschreibung, Tags, Glossarbegriffen, Veröffentlichen (8.2), Business Builder lesend (7.4, 7.7); Eltern-Kind-Hierarchie mit Assoziation von der Dimension (6.5.3, 6.5.4) und DAC-Typ Hierarchy (9.3.4, 9.9 Ablauf B) | OData, Excel-Add-in, Premium Outbound, Databricks, Marketplace, Data Sharing Cockpit, KPIs, CLI, Cloud Transport Management nur erklärt (meist ⚠ Lizenz); Details siehe unten |

## Widersprüche und offene Punkte (am echten Tenant prüfen)

1. **Data Access Controls:** 2.3.2 listet einen eigenen Navigationseintrag, 9.2 legt DACs im Data Builder an. **Geklärt (Screenshots `docs/design/`, Bild 17):** kein eigener Navigationseintrag; Reiter „Data Access Controls“ und Kachel „New Data Access Control“ im Data Builder.
2. **Gruppe „Monitoring“:** 10.2 nennt den Pfad *Monitoring › Data Integration › Flows*. **Geklärt (Bild 1/9):** Navigationsgruppe *Monitoring* mit System and Spaces, Capacities, Task Logs, Expensive Statement Logs, Elastic Compute Nodes, Data Integration. Spiel wird beim Design-Umbau angepasst.
3. **Reihenfolge der Seitennavigation:** laut 2.3.2 nicht verifiziert; ändert sich je Release. **Stand 09.10.2026** siehe `docs/design/README.md`, Abschnitt 1.
4. **Standardrollen:** nur DW Administrator, DW Viewer und Catalog User sind belegt.
5. **Feature-Matrix der Verbindungstypen (5.4.2):** komplett nicht verifiziert; das Spiel nutzt eine vereinfachte Matrix.
6. **Business Builder abgekündigt?** 7.7 findet keine offizielle Aussage; der echte Tenant titelt „Welcome to the Business Builder (Deprecated)“ (Bild 8).
   Spiel folgt dem Tenant. Handbuch 7.7 könnte um diesen Beleg ergänzt werden.
7. **Exkurse am echten Tenant prüfen (Curlin):** Schaltertext und Position von *Expose for Consumption* (Bild 21 zeigt ihn im Properties-Panel);
   ob Pakete Objekte mehrerer Spaces enthalten dürfen; wie Transport › Packages und Export im Detail aussehen (Bild 13/16 zeigen nur Import und Monitor);
   ob DACs für Datenbankbenutzer wirken.

## Was Kapitel 12 (Exkurse) aus dem Handbuch umsetzt

- **Verbrauch (12):** Schalter *Expose for Consumption* im Properties-Panel von SQL Views, Teil von Save/Deploy (12.3); Datenbankbenutzer je Space
  in Space Management › Database Access mit *Enable Read Access (SQL)* und *Enable Write Access (SQL, DDL, DML)* (12.6.2, Dialogtext laut KBA);
  Regel „ODBC liest freigegebene Views, Analytic Models gehen über SAC/Excel/OData“ (12.10)
- **Transport (11):** Navigation *Transport › Packages · Export · Import · Monitor* nach Bild 13/16; Paket mit Objekten und erforderlichen Paketen,
  Validierung, Export an Zielmandanten (Test, Production) ins Content Network, Exportzusammenfassung, Jobs im Monitor; Import-Optionen
  *Overwrite objects and data* inkl. Zeitpläne (Hinweis 3609213) und Delta Capture (Hinweis 3700359) als Erklärung (11.4.1–11.4.4, Ablauf A);
  Feld *Package* im Properties-Panel
- **Katalog (8.2):** Katalog-Suchseite mit Suche und Filtern (Typ, Veröffentlichungsstatus, Tags), Asset-Detailseite (extrahierte Metadaten,
  Beschreibung, Glossarbegriffe, Tags aus Tag-Hierarchien), Glossarbegriffe anlegen und getrennt veröffentlichen; „Metadaten, keine Daten“ (8.2.5)
- **Business Builder (7):** Willkommensseite „(Deprecated)“ nach Bild 8, Objektkette Geschäftsentität → Faktenmodell → Verbrauchsmodell mit
  Perspektiven, Berechtigungsszenario, Status *Ready to Use*, Analytical Dataset veraltet → Fact (7.4, 7.7); nur lesend

- **Hierarchien (6.5.3, 6.5.4, 9.3.4, 9.9 Ablauf B):** View mit Semantic Usage *Hierarchy* (Parent/Child), Assoziation Dimension → Hierarchie;
  Datenzugriffskontrolle vom Typ *Hierarchy*: Eintrag = Knoten, sichtbar sind Knoten und alle Nachfahren; ohne Eintrag nichts

Vereinfacht und gekennzeichnet: Hierarchy-DAC mit genau einem Kriterium (Knotenspalte) und Auflösung über eine rekursive Abfrage; keine
Hierarchy with Directory, keine Drill-down-Anzeige im Analytic Model. Ein Paket enthält Objekte genau eines Spaces (11.4.1 „nicht verifiziert“), andere Spaces über erforderliche Pakete;
Validierung = alle Abhängigkeiten (gelesene Objekte, Associations, DACs, Berechtigungsentität, Kettenschritte) sind im Paket oder in einem
erforderlichen Paket (11.4.2 „nicht verifiziert“); Export gelingt immer, wenn valide; der Import selbst wird nicht gespielt (Trainingsmandant =
Entwicklung). Der Katalog kennt nur den eigenen Mandanten als Quellsystem (bereits angebunden); jeder deployte View und jedes Analytic Model
ist ein Asset. Analytic Models gelten als konsumierbar ohne Schalter (12.3: „nicht verifiziert“). Wirkung von DACs bei Datenbankbenutzern wird
bewusst nicht gespielt (12.3: „nicht verifiziert“); die Mission gibt nur eine Dimension ohne DAC frei. Name des Datenbankbenutzers
`SPACE#SUFFIX` und IP-Allowlist kommen aus der SAP-Doku bzw. Praxis, nicht aus dem Handbuch (IP-Allowlist dort „nicht verifiziert“).
Business Builder: Die Bezeichnung „Deprecated“ ist durch Curlins Screenshot (Bild 8) belegt; das Handbuch fand dazu keine offizielle Aussage (7.7).
Nur erklärt: OData-API und OAuth-Clients, Excel-Add-in, Premium Outbound, Databricks/BDC, Marketplace, Data Sharing Cockpit, KPIs,
CLI, SAP Cloud Transport Management, Versionshistorie.


**Versionshistorie (c12-m07, Handbuch 11.4.9, ergänzt am 10.10.2026):** Jedes Deploy einer SQL View ist eine Version; Liste, Vergleich mit der
deployten Version und Restore im Editor über *Versions*. Nur SQL Views, letzte 15 Versionen; Restore stellt in den Editor und verlangt ein Deploy
(„nicht verifiziert“ im Handbuch, vereinfacht). Gilt nur im Mandanten; Produktion bekommt Änderungen per Transport.

**OData und OAuth-Client (c12-m08, Handbuch 12.7, 12.4.2, 3.4.2, ergänzt am 10.10.2026):** OAuth-Client mit Zweck *Interactive Usage*
(Authorization Code, Redirect URI) laut KBA 3563695; Menüpfad App Integration, Feldnamen, einmal angezeigtes Secret und URL-Aufbau sind im Handbuch
„nicht verifiziert“ und vereinfacht. Der Test-Aufruf ist eine Spiel-Simulation; DACs werden dabei bewusst nicht gespielt (12.3 „nicht verifiziert“).

**Content Network (c12-m09, Handbuch 8.6, 5.7, ergänzt am 10.10.2026):** Import über Semantic Onboarding in einen eigenen Space, Voraussetzungen
lesen, danach Verbindungen ergänzen (8.6.2 Schritt 167). Paketnamen, CDS-Namen und die Optionen Overwrite/Deploy sind erfunden bzw. vereinfacht
(8.6.2: Importoptionen „nicht verifiziert“). Import Entities aus SAP-Systemen (5.7) ist nur erklärt.

## Was Kapitel 3 aus dem Handbuch umsetzt

- Connection gehört genau einem Space, entsteht aus einem Typ; Validate zeigt verfügbare Features (5.1, 5.4.3, 5.4.4)
- On-Premise über Cloud Connector mit Location-ID; TLS braucht Server- oder CA-Zertifikat unter *Configuration › Security* (5.5)
- Remote Tables: Remote vs. Replicated (Snapshot); Steuerung im Data Integration Monitor; Empfehlung „Remote Only + Replication Flow“ (5.6, 6.4.4, 10.3.2)
- Replication Flow: Initial Only / Initial and Delta (nur delta-fähige Quellen), Truncate, Projektion mit Zusatzspalten (6.7.2)
- Monitor: ein Space, Tabs Remote Tables, Local Tables, Views, Flows, Remote Queries, Task Chains; Läufe mit Meldungen; Zeitpläne mit Consent (10.3)
- Space-Sperre bei Speicherüberschreitung, Unlock (4.4.3, 4.4.11); E-Mail-Benachrichtigung bei fehlgeschlagenen Replication Flows (10.3.5)

Nicht simuliert: Real-Time-Replikation, Data Provisioning Agent, Data Flows, Custom Connection Types, Premium Outbound, Cron-Ausdrücke.

## Was Kapitel 5 aus dem Handbuch umsetzt

- SQL View: genau eine SELECT-Anweisung, nur Objekte des eigenen Spaces und geteilte Objekte referenzierbar (6.5.2)
- Save → *Not Deployed* / *Changes to Deploy*, Deploy → *Deployed*; Prüfungen lesen nur die deployte Version (6.3.3)
- Impact and Lineage: vereinfacht als Abschnitt im Properties-Panel des Editors (*Reads from*, *Used by*, *Shared with*),
  ausgewertet über `SPACE.OBJEKT`-Referenzen im gespeicherten SQL; kein Diagramm, keine Space-übergreifende Katalog-Lineage (6.11.2)
- Sharing: Inbound → Harmonization → Reporting, immer nur eine Schicht nach oben; geteilte Objekte read-only (6.11.4)
- Bereitstellungsreihenfolge: Deploy einer View scheitert, solange eine Quelle nicht geteilt ist (6.13)

Nicht simuliert: SQLScript (Tabellenfunktionen), Validate-Button, Eingabeparameter, Persistenz (Kapitel 9), Intelligent Lookup (nur erwähnt).

## Was Kapitel 10 aus dem Handbuch umsetzt

- Aufgabenkette fasst Aufgaben zu einer ausführbaren, einplanbaren Einheit zusammen; Schritte: Replikationsflüsse (nur *Initial Only*), View-Persistenz, Remote-Tabellen, andere Ketten (6.8)
- E-Mail-Benachrichtigung bei Fehler oder Abschluss, im Editor der Kette (6.8, 10.3.6, 10.5)
- Ausführen und Einplanen im Editor und im Monitor; Zeitpläne laufen mit Zustimmung (10.3.6, 10.3.8)
- Monitor Task Chains: Läufe mit Schritten; Ablauf C „Fehlgeschlagene Aufgabenkette analysieren“ bis in den Detailmonitor (10.6)
- Task Logs über alle Spaces, mit Status und Laufzeit (10.5); der Data Integration Monitor zeigt immer nur einen Space (10.7)

Vereinfacht und gekennzeichnet: Schritte laufen nacheinander (kein Canvas, keine parallelen Zweige mit ALL/ANY); eine Kette enthält
Objekte ihres Spaces, andere Spaces über geteilte Ketten (laut SAP seit 11/2024, nicht im Handbuch); E-Mail erscheint als Meldung im
Lauf; Laufzeiten simuliert. Nicht simuliert: Transformation Flow, Pause/Fortsetzen, Cron-Ausdrücke, Übernahme fremder Zeitpläne, SAP Cloud ALM.

## Was Kapitel 9 aus dem Handbuch umsetzt

- Views sind standardmäßig virtuell; Persistenz speichert das Ergebnis als Snapshot: schneller, kostet Speicher (6.5.6)
- Views-Monitor im Data Integration Monitor: Datenpersistenz starten, persistierte Daten entfernen, Zeitplan, Läufe mit Meldungen (10.3.4, 10.3.8)
- View Analyzer: View mit abhängigen Views, Kennzahlen je Ebene, auf welcher Ebene Persistenz lohnt (10.3.4, vereinfacht)
- Expensive Statement Tracing in der Monitoring-Konfiguration, Anweisungen mit Dauer, Spitzenspeicher, CPU-Zeit (10.4.3, 10.4.4); Ablauf D „Speicherengpass untersuchen“ (10.6)
- Grenze: Ein View, der einen View mit Datenzugriffskontrolle verwendet, ist nicht persistierbar (9.3.7)
- Zeitpläne laufen nur mit gültiger Zustimmung (10.7)

Vereinfacht und gekennzeichnet: Laufzeiten, Speicher und CPU-Zeit simuliert für Produktionsvolumen (Kostenmodell `src/perf.ts`);
Deploy eines persistierten Views entfernt den Snapshot; ein View mit eigener DAC darf persistiert werden. Nicht simuliert: Partitionierung,
Explain Plan/PlanViz, Speicherprüfung des Spaces beim Persistieren, System Monitor-Dashboard.

## Was Kapitel 6 aus dem Handbuch umsetzt

- Semantic Usage je Entität: Relational Dataset, Fact, Dimension, Text, Hierarchy (6.5.3)
- Spalten von Fact/Dimension als Measure oder Attribut, Key-Kennzeichen (6.4.1)
- Associations mit Ziel und Schlüsselzuordnung; Fact → Dimension; wirken erst bei Nutzung als Join (6.5.4)
- Dimensionen ergeben sich im Analytic Model aus den Associations des Facts (6.10.4) – Grundlage für Kapitel 7

Vereinfacht und gekennzeichnet: Kardinalität immer „many to one“; Associations nur im Properties-Panel (kein E/R-Modell);
Hierarchy wählbar, Mission folgt später. Nicht simuliert: Hierarchy with Directory, semantische Spaltentypen, Expose for Consumption (Kapitel 12).

