# AI_CONTEXT – Datasphere Game

> Einstieg für jede neue AI-Session. Zuerst diese Datei lesen, dann `docs/STATUS.md`.
> Vor jeder UI-Arbeit: `docs/design/README.md` (verbindliches Design nach Curlins Screenshots).
> Am Ende jeder Session: `docs/STATUS.md` und Abschnitt „Nächster Schritt“ unten aktualisieren,
> neue Architektur-Entscheidungen in `docs/DECISIONS.md` eintragen.

## Was ist das?

Ein Lernspiel im Browser, das SAP Datasphere simuliert. Der Spieler baut als Data Architect
für die fiktiven **Stadtwerke Rheinau** (Energieversorger) eine komplette Datasphere-Landschaft auf:
Spaces, Rollen, drei Layer (**Entry → Data & Semantic → Presentation**, seit 13.10.2026), Views, Semantik, Analytic Model,
Data Access Controls, Task Chains, Import Entities aus S/4HANA. Jeder Schritt wird selbst gemacht, es gibt nur gestufte Tipps.

Besitzer: Curlin (Wirtschaftsinformatik-Student, arbeitet im Reporting-Umfeld, kennt Datasphere-Begriffe,
hat aber noch nicht selbst modelliert).

## Feste Rahmenbedingungen

- Nur Desktop-Browser (PC), kein Mobile-Layout nötig
- Spieltexte und UI **komplett Englisch** (wie die echte Datasphere-Oberfläche)
- Projektdokumentation (diese Dateien) auf Deutsch
- **Grundlage ist der Aufbau von Datasphere, nicht SQL:** gleiche Apps, Namen und Abläufe (Seitennavigation, Space wählen,
  Objektliste, Save/Deploy, Properties-Panel)
- **Optik wie die echte SAP Datasphere (Theme Horizon)** nach `docs/design/` (21 Screenshots + Beschreibung von Curlin): Shell, Navigation,
  Farben, Seitentypen, Beschriftungen. Keine SAP-Logos, -Bilder oder -Schriftdateien
- Modellierung per **SQL View**, keine Graphical Views (Kachel zeigt nur Erklärung)
- Standard-SQL via DuckDB-WASM; HANA-Unterschiede nur als Info-Karten
- Ruhige Business-Simulation mit Karriere-Rängen und Badges, keine laute Spieloptik
- Tipps frei nutzbar, kosten aber XP; nie eine fertige Lösung anzeigen
- Start mit 0 XP; jede Mission hat ein kostenloses, stark geführtes Tutorial: zeigt jeden Klick und wartet, bis der Spieler ihn selbst gemacht hat
  (Kapitel 0–1 mit konkreten Werten, ab Kapitel 2 bleiben Entscheidungen als erklärende Schritte beim Spieler)
- Mentor im Spiel: Calin Mucea
- **Layer-Logik (Wunsch von Curlin, 13.10.2026):** `RHN_ENTRY` (Entry: Quelldaten 1:1, Connections, Flows, importierte Entities) →
  `RHN_DSL` (Data & Semantic: Basis-Views `RHN_DS_V_` säubern, darauf Dimensionen/Facts/Hierarchien/Associations, Berechtigungstabellen und DACs) →
  `RHN_PRES` (Presentation: nur was Konsumenten sehen, Analytic Models `RHN_PR_AM_` und Konsum-Views `RHN_PR_V_` auf **geteilten** Facts/Dimensionen).
  Geteilt wird immer genau eine Ebene nach oben; Presentation bekommt keine Basis-Views und keine Entry-Daten. Jede Kapitel-Einführung zeigt die
  Ebene als kleine Layer-Grafik (`layerStep` in `guided.ts`)
- Tipp-Stufen je Kapitel (`guidance`): 0–1 alle offen, 2–4 nur Richtung frei, 5–10 nur gegen XP, 11 keine, 12 (Exkurse) wieder nur Richtung frei
- Keine SAP-Logos/Wortmarke/Bilder; Spielmarke „Datasphere Game“ an der Logo-Stelle; Missions-Panel als Horizon-Seitenpanel

## Stack

| Baustein | Wahl |
| --- | --- |
| Gerüst | Vite + TypeScript, kein großes UI-Framework |
| SQL | DuckDB-WASM |
| Editor | CodeMirror 6 |
| Inhalte | `src/content/missions/cXX.ts`, datengetrieben |
| Spielstand | localStorage + JSON-Export/Import |
| Testdaten | Generator-Skript mit festem Seed |
| Hosting | privates claude.ai-Artifact (`npm run build:artifact`), Repo bleibt privat |

## Ordnerstruktur

```
AI_CONTEXT.md        ← du bist hier
docs/PLAN.md         ← vollständiger Plan (Kapitel, Mechaniken, Architektur)
docs/STATUS.md       ← Checkliste + Session-Log
docs/DECISIONS.md    ← Architektur-Entscheidungen
docs/DATA.md         ← Testdaten: Tabellen, eingebaute Fehler, Zahlen, Quellsysteme
docs/design/         ← verbindliches Design: README (Regeln, Farben, Seitentypen, Abgleich), screenshots/ (21 Bilder), BILDBESCHREIBUNGEN.md, quelle/ (docx)
docs/handbuch/       ← Curlins SAP-Datasphere-Handbuch: docx + Markdown je Kapitel (fachliche Quelle, README = Inhaltsverzeichnis)
docs/FRAGEN_AN_CURLIN.md ← offene Fragen an Curlin (Screenshots, Prüfpunkte am echten Tenant); am Ende jeder Session danach fragen
docs/HANDBUCH_ABGLEICH.md ← Abgleich mit Curlins SAP-Datasphere-Handbuch: was abgedeckt ist, was dort „nicht verifiziert“ ist
src/main.ts          ← Shell (Tenant-Banner, Shellbar, Seitennavigation mit Gruppen), Routing, Zurück-Verlauf, Home, App-Infoseiten, Glossar, Missions-Panel, Boot
src/ctx.ts           ← gemeinsamer Zustand + Callbacks für die Views (vermeidet Import-Zyklen)
src/ui.ts            ← Helfer: esc, Layer-Farben (en/ds/pr nach Space-ID-Endung _ENTRY/_DSL/_PRES), Icons, Dialog, Toast, Ergebnistabelle
src/content/apps.ts  ← App-Katalog der Seitennavigation (Name, Gruppe, Zweck, ab welchem Kapitel interaktiv) + „New“-Kacheln des Data Builders
src/analytic.ts      ← Kapitel 7: Analytic Model – Definition (Measures, Variablen), Quellen aus dem deployten Fact, `modelError`, `modelSql` (Abfrage wie SAC), Persistenz
src/views/analytic.ts ← Kapitel 7: Editor des Analytic Model (Fact-Auswahl, Canvas, Properties, Measure-/Variablen-Dialoge, Data Preview)
src/localtable.ts    ← Kapitel 8: lokale Tabellen (Spalten, Zeilen, CREATE/INSERT, Prüfung); Exkurs: Delta Capture (`deltaBetween` → Änderungssätze I/U/D, `deltaLog` am Objekt)
src/views/table.ts   ← Kapitel 8: Tabellen-Editor mit Data Editor
src/dac.ts           ← Kapitel 8/12: Data Access Controls – Single Values und Hierarchy (Knoten + Nachfahren, rekursiv), Zuweisung, `securedFrom` (lesen als Benutzer), DAC_USERS
src/views/dac.ts     ← Kapitel 8: DAC-Editor
src/views/semantics.ts ← Kapitel 6+: Spaltenrollen (Key/Attribute/Measure/Parent/Child) und Associations im Properties-Panel, `viewColumns`
src/views/builder.ts ← Data Builder: Space-Auswahl → Startseite (New-Kacheln, Objektliste, geteilte Objekte) → Editoren (Tabelle, SQL View)
src/views/repository.ts ← Repository Explorer: Suche/Filter über alle Spaces, öffnet Objekte im Data Builder
src/views/spaces.ts  ← Space Management (Kacheln, Anlegen/Bearbeiten/Löschen)
src/views/security.ts ← Security mit Unterseiten Users · Roles · Authorization Overview · Activities (`SECURITY_PAGES`, `securityTo`), Monitoring-Listenstil
src/views/settings.ts ← Benutzermenü am Avatar (Settings · About · Sign Out) und Settings-Dialog (Bild 20): Theme, Business/Technical Name (`shownName` in ui.ts)
src/views/connections.ts ← Connections: Space-Auswahl, Liste, Create (Typ-Auswahl mit Features), Edit, Validate, Delete
src/views/monitor.ts ← Data Integration Monitor: Remote Tables (Snapshot, Remove, Schedule), Views ab Kapitel 9 (Persistenz, Schedule, Läufe, View Analyzer), Task Chains ab Kapitel 10 (Run, Schedule, Schritte mit Sprung in den Detailmonitor), Flows (Run, Schedule, Lauf-Log), Remote Queries, Consent
src/views/system.ts  ← System mit Unterseiten Configuration · Administration (`SYSTEM_PAGES`, `systemArea`; App Integration mit OAuth-Clients ab den Exkursen, Tour-Ansicht `system:admin-apps`); Configuration (Monitoring = Expensive Statement Tracing ab Kapitel 9, Security = Zertifikate, Data Integration = Cloud Connector; Rest Info), About
src/views/flow.ts    ← Data Builder: „Import Remote Tables“-Dialog, Replication-Flow-Editor, `flowError` (Deploy-Prüfung)
src/integration.ts   ← Kapitel 3: Verbindungstypen + Features, Quellsysteme, validateConnection, Remote Tables, runFlow, truncateRisk, Space-Sperre (`lockError`), Wiederherstellung nach Reload
src/repo.ts          ← Repository-Objekte: Business/Technical Name, Status (Not Deployed / Changes to Deploy / Deployed), Deploy, Wiederherstellen nach Reload, Impact/Lineage (`readsFrom`, `usedBy`), Semantik (`Semantics`, `semanticsOf`) im Design- und Deploy-Stand
src/db.ts            ← DuckDB-WASM: initDb, runSql, exec, listObjects (Spaces = DuckDB-Schemas)
src/editor.ts        ← CodeMirror-SQL-Editor, Strg+Enter, Schema-Autocomplete, Farben über CSS-Variablen
src/data/generator.ts ← Datengenerator (fester Seed, eingebaute Fehler) + datasetToSql, lädt RHN_ENTRY beim Start
src/content/chapters.ts ← Kapitel, Ränge, Glossar (jeder Begriff mit `chapter`: erscheint ab diesem Kapitel)
src/content/tutorials.ts ← TUTORIALS (Einstieg je Mission) + TASK_TOURS (Show-me je Aufgabenschritt), heute nur Sammelstelle für `guided.ts` – jede neue Mission braucht beides!
src/content/missions/ ← Missionen je Kapitel (`c00.ts` … `c12.ts`), Reihenfolge in `index.ts`; Missionen können ein `setup` haben (einmalige Startsituation)
src/missions/types.ts ← Missions-Format: Ticket, Tasks, Hints, Checks (result – Editor oder deployte View mit `object`/`columns`/`counts` –, structure, question, rule, metric, model), Review-Regeln, XP
src/missions/engine.ts ← Prüf-Engine: Ergebnis (SQL im SQL-View-Editor vs. Musterlösung, `diagnose`), Struktur, Fragen, Regeln auf Tenant + Ereignissen
src/missions/review.ts ← Review-Regeln von Calin (no_select_star, alias_aggregates, explicit_join, no_logic_in_inbound, case_else); bei View-Missionen auf dem deployten SQL
src/progress.ts      ← Spielstand v4 (je Mission inkl. Ereignisse + Tenant), Migration v2/v3, Ränge, Export/Import, `unlockedChapter`
src/tenant.ts        ← Tenant: Spaces (Storage, Priorität), Shares, aktiver Space, Sharing-Sperre `accessError`, Rollen/Zuweisungen
src/security.ts      ← Rollenmodell: GLOBAL_ADMIN, Vorlagen (TEMPLATES), Scoped Roles, `effectiveAccess`
src/content/people.ts ← Personas für Kapitel 2 (Jonas, Calin, Lena, Tim, Sabine, Petra, Markus, Aylin, Nina)
tests/playtest/      ← Headless-Durchläufe je Kapitel (Playwright/Python), vor jedem Commit laufen lassen: `bash tests/playtest/run_all.sh <ordner>`
src/tutorial.ts      ← Tutorial-Engine: Popup mit Spotlight, Ansicht wechseln, Beispiel in Editor; Hands-on-Schritte (`action`: event/appear/check), die auf den Spieler warten
src/content/guided.ts ← Geführte Tutorials aller Kapitel 0–12 (Kapitel 11 nur Intro, keine Hilfe): GUIDED_INTROS (Konzepte) + GUIDED_TOURS (Hands-on je Aufgabe); Missions-Tutorial = Intro + alle Aufgaben + Check
src/styles.css       ← Horizon-Design-Tokens (hell/dunkel) nach docs/design, Layer-Farben --layer-en/-ds/-pr; Seitentypen A–G am Dateiende
src/brand.ts         ← MSC-Logo (Curlins Marke, aus Vorlage vektorisiert, Farben über --msc-* hell/dunkel) statt SAP-Logo
src/perf.ts          ← Kapitel 9: View-Persistenz (Snapshot im Schema `persistence`), `persistError` (DAC-Grenze), Kostenmodell `analyze` (simulierte Produktionslaufzeit), Expensive Statements (`traceStatement`, `simulateStories`)
src/views/statements.ts ← Kapitel 9: Monitoring › Expensive Statement Logs
src/taskchain.ts     ← Kapitel 10: Task Chains – Definition (Schritte, E-Mail), `stepError` (Initial Only, eigener Space/geteilte Kette, DAC-Grenze, Zyklen), `runChain` (Schritt für Schritt, Abbruch bei Fehler)
src/views/chain.ts   ← Kapitel 10: Task-Chain-Editor im Data Builder (Add Step, Reihenfolge, E-Mail, Run, Schedule)
src/views/tasklogs.ts ← Kapitel 10: Monitoring › Task Logs (alle Spaces, Filter Status/Space, Meldungen)
src/views/welcome.ts ← Seitentyp A: „Welcome to the …“ mit Space-Karten (usedMB, fmtSize)
src/views/toolbar.ts ← Objekt-Werkzeugleiste der Editoren, „Versions“ (SQL Views ab den Exkursen), „Details“, Kopf „Model Properties“
src/views/versions.ts ← Exkurs: Version History einer SQL View (Liste, Zeilen-Diff `lineDiff`, Restore); Versionen entstehen in `deploy()` (`repo.ts`: `addVersion`, `restoreVersion`)
src/consumption.ts   ← Kapitel 12: Datenbankbenutzer je Space (SPACE#SUFFIX, Read/Write), was sie lesen (freigegebene Views); OAuth-Clients und simulierter OData-Aufruf (`odataRequest`, `odataUrl`)
src/transport.ts     ← Kapitel 12: Pakete, Abhängigkeiten (`dependencies`), Validierung, Export-Jobs, Zielmandanten, `presetPackage` (Setup)
src/views/transport.ts ← Kapitel 12: Transport › Packages (Editor mit Objekten, Required Packages, Validation) · Export · Import · Monitor
src/catalog.ts       ← Kapitel 12: Katalog-Metadaten (Assets, Glossarbegriffe, Tag-Hierarchien), Suche
src/views/catalog.ts ← Kapitel 12: Catalog & Marketplace › Search (Suche, Filter, Asset-Detailseite, Glossarbegriffe, Veröffentlichen)
src/views/business.ts ← Kapitel 12: Business Builder (Deprecated), lesend, mit Altobjekten von 2023 in RHN_PRES
src/dataflow.ts      ← Kapitel 12: Data Flows – Definition (Quelle, Join, Projektion, Aggregation, Ziel + Modus), `dataFlowSelect`, `dataFlowError`, `runDataFlow` (Ziel anlegen, Append/Truncate/Delete, Zeilen im Spielstand)
src/views/dataflow.ts ← Kapitel 12: Data-Flow-Editor (Knotenreihe als Canvas, Eigenschaften je Knoten, SQL-Vorschau, Läufe)
src/transformflow.ts ← Kapitel 12: Transformation Flows – SQL-View-Transform, Ziel, Ladeart; `transformError`, `runTransformFlow` (Initial Only = Volllast, Initial and Delta = Erstladung + Delta-Zeiger `tfPointer`, Änderungen per Schlüssel)
src/views/transformflow.ts ← Kapitel 12: Transformation-Flow-Editor (zwei Knoten, SQL-Editor mit Data Preview, Ladeart in den Flow-Eigenschaften, Läufe)
src/onboarding.ts    ← Kapitel 12: Content-Network-Pakete (`PACKAGES`), `importPackage` (Space anlegen, Objekte, Deploy, Log), Import-Logs im Tenant
src/views/onboarding.ts ← App Semantic Onboarding (Bild 10): SAP Systems (S/4-Karten öffnen Import Entities, ab Kap. 3), Content Network (ab Kap. 12), Paketseite, Import-Dialog, Import Logs
src/views/importentities.ts ← Kapitel 3: Assistent Import Entities (Configuration · Select Entities · Review Entities, Import and Deploy); Engine in src/onboarding.ts, CDS-Katalog in src/integration.ts
src/badges.ts        ← Badges (aus dem Spielstand abgeleitet, nichts extra gespeichert): Kapitel-Meilensteine, First Try, Calin Approves, Self-Reliant
scripts/data-report.ts ← `npm run data:report`: Zeilen, Fehlerzahlen, Fingerprint der Testdaten
```

## Konventionen

- Objektnamen im Spiel: Präfix `RHN_`, Layer-Kürzel `EN` / `DS` / `PR`, z. B. `RHN_DS_V_CONTRACTS`, `RHN_DS_F_INVOICES`, `RHN_PR_AM_INVOICES`.
  Importierte S/4-Objekte behalten SAP-Namen (`I_UTILSDIVISION`, `I_UTILSDIVISION_DIM`, `RF_I_UTILSDIVISION`)
- Spaces: `RHN_ENTRY`, `RHN_DSL`, `RHN_PRES`
- Mission-IDs: `c<Kapitel>-m<Nr>`, z. B. `c05-m02`
- Commits auf Englisch, kurz und im Imperativ

## Aktueller Stand

Die Oberfläche folgt seit 09.10.2026 dem Aufbau von SAP Datasphere: Seitennavigation mit den echten Apps (nicht gebaute Apps
zeigen eine Infoseite, was sie tun), Data Builder mit Space-Auswahl, Startseite mit „New“-Kacheln und Objektliste, Editoren mit
Properties-Panel, Save/Deploy/Share/Data Preview; Repository Explorer; Space Management als Kacheln; Security.

Spielbar (64 Missionen, Hauptspiel und Exkurse komplett):
- Kapitel 0 „Find your way“ (ohne SQL): Apps kennenlernen, Space wählen, Repository Explorer, Save vs. Deploy
- Kapitel 1 Space Concept, Kapitel 2 Users & Roles
- Kapitel 3 Data Integration (alles in `RHN_ENTRY`): Connections, Cloud Connector + Zertifikat, Remote vs. Snapshot, Replication Flows (Delta, Truncate, Projektion), gesperrter Space;
  **c03-m07 Import Entities**: Semantic Onboarding › SAP S/4HANA Cloud › Assistent, `RHN_S4U`, Data Access *Replication Flow to Local Tables*,
  Entity `I_UTILSDIVISION` (bringt Textentität `I_UTILSDIVISIONTEXT` mit), Flow `RF_I_UTILSDIVISION` laufen lassen, Import Log lesen, Dimension + Texte mit `RHN_DSL` teilen
- Kapitel 4 Entry Layer: SQL-Profiling im Scratch-SQL-View
- Kapitel 5 Base views: deployte SQL Views in `RHN_DSL` (`RHN_DS_V_CONTRACTS` per CASE oder Mapping-Tabelle `RHN_DS_T_CODE_MAP`, `RHN_DS_V_CUSTOMERS`, `RHN_DS_V_METER_READINGS`); c05-m05 fragt in `RHN_DSL` ab, nichts geht nach `RHN_PRES`
- Kapitel 6 Semantics (in `RHN_DSL`): Dimensionen `RHN_DS_D_GRID_AREA/_TARIFF/_CUSTOMER`, Facts `RHN_DS_F_CONSUMPTION/_INVOICES` mit Spaltenrollen und Associations, nur auf Basis-Views; 1:1-Basis-Views `RHN_DS_V_GRID_AREAS/_TARIFFS/_INVOICES`
- Kapitel 7 Analytic Model (in `RHN_PRES`): Fact + benötigte Dimensionen aus `RHN_DSL` teilen (Kundendimension **nicht**), `RHN_PR_AM_INVOICES` (NET/TAX, GROSS_AMOUNT calculated, UNPAID_GROSS restricted, CUSTOMERS count distinct, Variable V_INVOICE_DATE) und `RHN_PR_AM_CONSUMPTION`
- Kapitel 8 Data Access Controls (in `RHN_DSL`): Berechtigungstabelle `RHN_DS_T_PERMISSIONS` (Data Editor), DAC `RHN_DS_DAC_GRID_AREA` (Single Values), zugewiesen an beide Facts; geteilte Facts nehmen die DAC mit, die Modelle in `RHN_PRES` filtern; Prüfen „View as“ MBRANDT/ADEMIR/PLINDNER
- Kapitel 9 Persistence and Performance: Expensive Statement Tracing (System › Configuration › Monitoring) und Expensive Statement Logs (simulierte SAC-Last), View Analyzer (in `RHN_DSL`), `RHN_DS_V_METER_READINGS` persistiert und täglich eingeplant; Grenzen: `RHN_PR_V_REGION_REVENUE` (liest DAC-geschützten Fact) nicht persistierbar, persistierte `RHN_DS_V_TARIFFS` (Setup) zurückbauen
- Kapitel 10 Operations: Task Chain `RHN_EN_TC_CRM` (CRM-Flow, geteilt mit RHN_DSL), `RHN_DS_TC_NIGHTLY` (verschachtelte Kette → Persistenz `RHN_DS_V_CUSTOMERS` → `RHN_DS_V_METER_READINGS`, E-Mail an LHOFFMANN, täglich); Fehlerlauf durch Tims CAST (c10-m03, `setupAsync`); Task Logs mit simulierten Fehlern von `RHN_EN_RF_S4U` (c10-m04)
- Kapitel 11 Board request (ohne Hinweise): `READING_MONTH` (Text YYYY-MM) im deployten `RHN_DS_F_CONSUMPTION` (Fact, DAC bleibt), Attribut in `RHN_PR_AM_CONSUMPTION`; Markus' Sicht über die geerbte DAC (keine Kopie); Nachtkette nach der Änderung + Laufzeit < 3 s
- Kapitel 12 Exkurse: Power BI (Konsum-View `RHN_PR_V_TARIFFS` in `RHN_PRES` auf der geteilten Tarifdimension, exposed, Datenbankbenutzer `RHN_PRES#…` nur lesend, nichts in `RHN_DSL` exponieren); Transport (Paket in RHN_PRES
  mit dem Modell, alles aus `RHN_DSL` über das erforderliche Paket `RHN_DS_PKG_MODEL`, Export an Test und Production);
  Katalog (Asset `RHN_PR_AM_CONSUMPTION` beschreiben, taggen, Glossarbegriff verknüpfen, beides veröffentlichen); Business Builder (Altobjekte lesen,
  Ablösung durch `RHN_PR_AM_INVOICES`); Hierarchien: `RHN_DS_H_GRID_AREA` (RHEINAU → R_NORTH/R_SOUTH → Netzgebiete) an `RHN_DS_D_GRID_AREA`,
  DAC `RHN_DS_DAC_REGION` (Typ Hierarchy, Tabelle `RHN_DS_T_PERMISSION_NODES` mit 3 Zeilen) ersetzt auf `RHN_DS_F_INVOICES` die Single-Values-DAC;
  Versionshistorie (c12-m07): Tims Version von `RHN_DS_V_CONTRACTS` (nur S4U) per Versions › Restore zurückrollen und deployen;
  OData (c12-m08): Konsum-View `RHN_PR_V_GRID_AREAS` in `RHN_PRES` bauen und freigeben, OAuth-Client *Interactive Usage* mit Redirect URI der Planungs-SAC, Test-Aufruf mit HTTP 200;
  Data Flow (c12-m10, in `RHN_DSL`): `RHN_DS_DF_MONTHLY` (Ablesungen JOIN Verträge, Monat + Netzgebiet, SUM) schreibt `RHN_DS_T_MONTHLY_CONSUMPTION` mit Truncate, zweimal gelaufen;
  Transformation Flow (c12-m11): Delta Capture auf `RHN_EN_T_PAYMENTS` (95 Zahlungen, vom Setup angelegt und mit RHN_DSL geteilt), `RHN_DS_TF_PAYMENTS` (Initial and Delta, + CONTRACT_ID aus `RHN_DS_V_INVOICES`) → `RHN_DS_T_PAYMENTS`; Erstladung, Bankmeldung (PAY-0096 neu, PAY-0012 = 286.38, PAY-0007 gelöscht), Delta-Lauf mit 3 Schlüsseln;
  Nachtlauf (c12-m12): Setup löscht die Zahlungen vom 12.02. im Ziel (Tims Test) und fügt PAY-0097 in der Quelle hinzu; Reset Delta im Data Integration Monitor › Flows, Lauf (Erstladung, 96 Zeilen), Flow als letzter Schritt in `RHN_DS_TC_NIGHTLY`, Kette deployt und gelaufen;
  Content Network (c12-m09): Paket *Utilities – Billing Analysis* über Semantic Onboarding in eigenen Space `SAP_UTIL` importieren, Import-Log lesen (Verbindung `SAP_S4H` fehlt), Fact im Repository Explorer

**Fachliche Quelle:** Curlins „SAP Datasphere Handbuch“ in `docs/handbuch/` (Original-docx + Markdown je Kapitel, Übersicht in
`docs/handbuch/README.md`). Vor jedem neuen Kapitel die passenden Handbuch-Kapitel lesen; Stellen mit „nicht verifiziert“ nur vereinfacht
und gekennzeichnet bauen. Abgleich und offene Punkte: `docs/HANDBUCH_ABGLEICH.md`.

Ab Kapitel 5 prüfen Missionen die **deployte View** (`ResultCheck.object` + `columns`), nicht den Editor; `metric`-Prüfungen liefern fachliche Kennzahlen.
Ab Kapitel 7 fragen `model`-Prüfungen das **deployte Analytic Model** ab (Zeilen = Attribut-IDs wie `RHN_DS_D_GRID_AREA.REGION`, Measures nach Namen).

Prüfungen auf Klicks laufen über **Ereignisse** je Mission (`ctx.track`, z. B. `app:builder`, `security:<users|roles|authorization>`, `system:<configuration|administration>`, `theme:…`, `names:business|technical`, `space:builder:RHN_ENTRY`,
`open:RHN_ENTRY.TARIFFS`, `preview:…`, `preview-in:<Space>:<Objekt>`, `repository-open:…`, `search:repository:…`, `save:…`, `deploy:…`,
Kapitel 3: `create-connection:…`, `validate:<Space>.<Name>:ok|fail`, `import-remote:…`, `snapshot:…`, `schedule:…`, `run:<Flow>:<Status>`,
`monitor:<Tab>`, `monitor-open:<Flow>`, `upload-cert:…`, `unlock:<Space>`, `consent`; Kapitel 12: `expose:<Objekt>:on|off`, `dbaccess:<Space>`, `dbuser:<Space>#<Suffix>:r|w|rw`, `transport:<Seite>`, `package-add:<Objekt>`, `package-require:<Paket>`, `package-validate:<Paket>:ok|fail`, `package-save:<Paket>`, `export:<Paket>:Success|Failed`, `import-dialog:<Paket>`, `catalog-open:<Objekt>`, `asset-tag:<Objekt>:<Tag>`, `asset-term:<Objekt>:<Begriff>`, `asset-publish:<Objekt>`, `term-create:<Begriff>`, `term-publish:<Begriff>`, `bb-space:<Space>`, `bb-open:<Space>.<Objekt>`, `bb-tab:<Objekt>:<Reiter>`, `versions:<Objekt>`, `version-view:<Objekt>:<Nr>`, `version-restore:<Objekt>:<Nr>`, `admin:<Reiter>`, `oauth-create:<Name>:<Purpose>`, `oauth-delete:<Name>`, `odata-test:<Client>:<Objekt>:<Status>`, `onboarding:<Bereich>`, `content-open:<Paket>`, `content-import:<Paket>:overwrite|keep:deploy|nodeploy`, `import-logs`, `import-log-open:<Paket>`, `df-node:<Knoten>`, `df-source:<Objekt>`, `df-join:<Objekt>`, `df-agg:on|off`, `df-mode:<Modus>`, `df-run:<Flow>:<Status>`; Kapitel 7: `am-fact:<Fact>`, `am-node:<fact|Dim>`, `am-dim:<Modell>:<Dim>`, `am-measure:<Typ>:<Name>`, `am-variable:<Name>`, `am-preview:<Modell>`, `am-rows:<Modell>:<Attribute>`; Kapitel 9: `tracing:on|off:<ms>`, `statements-sort:…`, `statements-refresh`, `analyzer:<View>`, `persist:<View>`, `persist-fail:<View>`, `unpersist:<View>`, `schedule:<View>:<Frequenz|none>`, `am-runtime:<Modell>:<ms>`; Kapitel 10: `chain-add:<Objekt>`, `chain-refused:<Objekt>`, `chain-run:<Kette>:<Status>`, `chain-step-open:<Objekt>`, `tasklogs-status:…`, `tasklogs-space:…`, `tasklog-open:<Objekt>`). Kapitel-3-Prüfungen lesen vor allem den Tenant-Zustand.
Deployte SQL Views werden im Spielstand gespeichert und beim Start wieder angelegt.

Neue Mission anlegen: Eintrag in `src/content/missions/cXX.ts` (Zahlen vorher gegen die Daten prüfen),
Intro + Hands-on-Schritte je Aufgabe in `src/content/guided.ts` (Ansichten für Touren: App-ID oder `builder:landing|new-view|spaces[:SPACE]`, `monitor:<Reiter>[:SPACE]`, `system:<Reiter>`, `transport:<Seite>`; SQL-Schritte warten mit `ranWith(...)` auf Abfrage + Data Preview),
Playtest in `tests/playtest/` ergänzen und laufen lassen.

## Nächster Schritt

0. **Layer-Umbau vom 13.10.2026** (Entry / Data & Semantic / Presentation, Import Entities c03-m07) ist gebaut. Offene Abgleichfragen zum
   Projekt (Namen, wo DACs liegen, Modelle auf geteilten Facts, Import-Namen) stehen in `docs/FRAGEN_AN_CURLIN.md`; Antworten einarbeiten.
   Neue Objekte immer nach der Regel einordnen: bringt Daten herein → `RHN_ENTRY`; säubert oder gibt Bedeutung (inkl. DACs) → `RHN_DSL`;
   sehen Konsumenten → `RHN_PRES` auf geteilten Objekten. Neue Kapitel-Intros bekommen einen `layerStep`
1. **Alles, was Curlin am echten Tenant klären muss** (Screenshots, fachliche Prüfpunkte), steht in `docs/FRAGEN_AN_CURLIN.md`.
   Am Ende jeder Session danach fragen; Antworten einarbeiten
2. Alle Apps der Navigation sind bedienbar. Optik folgt Bild 1–46 (`docs/design/`); was Curlins Tenant nicht zeigt, ist nach der SAP-Hilfe gebaut (GitHub `SAP-docs/sap-datasphere`, Stand 08.10.2026; für neue Fragen zuerst dort suchen). Offene Optik-Abweichungen: `docs/design/README.md`, Abschnitt 4 „Noch offen“
3. **Sandbox** (Home › Sandbox) nach jeder neuen Mission mit `tests/playtest/sandbox.sh` neu erzeugen, sonst fehlt die Mission im Sandbox-Stand
4. Alle geplanten Exkurse sind gebaut, dazu Data Flows und Transformation Flow mit Delta (c12-m11). Mögliche weitere: E/R-Modell (6.6), Data Marketplace mit Lizenzschlüssel (8.3), Import Entities im Semantic Onboarding;
   Transformation Flow in der Nachtkette und Reset Watermark (bis 12.10.2026 „Reset Delta“) sind seit c12-m12 gebaut
5. **Umbauten aus Curlins Antworten vom 12.10.2026** sind alle gebaut (12.10.2026, zweite Session): Delta Capture nur vor dem ersten Deploy
   (c12-m11 übergibt die Tabelle gespeichert; Missions-Hook `setupAgain` gibt sie nach dem Löschen neu), OAuth-Dialog mit *Technical User* und
   Lifetimes, Content-Network-Meldungen im Paket (*Import Overview*), *Open Import Logs* nur für Import Entities, Data Flow mit *Calculated Column*.
   Optik: alle Punkte aus `docs/design/README.md` Abschnitt 4 sind erledigt (12.10.2026); Tabellen-/DAC-Editor sind Objektseiten (`objectPage` in `toolbar.ts`).
   **Back-Pfeil** der Shellbar geht seitenweise zurück (`src/nav.ts`: Apps mit Unterseiten melden ihren Ort mit `registerLocation`; neue Seiten dort eintragen)
6. **Testlauf 12.10.2026** (Bericht als Doc an Curlin): `tests/playtest/chain.sh` spielt das ganze Spiel ab leerem Spielstand durch (alle Kapitel-Skripte
   verkettet); vor größeren Änderungen mitlaufen lassen. Alle 60 Hands-on-Tutorials ließen sich am echten Spielstand durchspielen
