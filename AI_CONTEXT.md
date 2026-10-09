# AI_CONTEXT – Datasphere Game

> Einstieg für jede neue AI-Session. Zuerst diese Datei lesen, dann `docs/STATUS.md`.
> Am Ende jeder Session: `docs/STATUS.md` und Abschnitt „Nächster Schritt“ unten aktualisieren,
> neue Architektur-Entscheidungen in `docs/DECISIONS.md` eintragen.

## Was ist das?

Ein Lernspiel im Browser, das SAP Datasphere simuliert. Der Spieler baut als Data Architect
für die fiktiven **Stadtwerke Rheinau** (Energieversorger) eine komplette Datasphere-Landschaft auf:
Spaces, Rollen, Layer (Inbound → Harmonization → Reporting), Views, Semantik, Analytic Model,
Data Access Controls, Task Chains. Jeder Schritt wird selbst gemacht, es gibt nur gestufte Tipps.

Besitzer: Curlin (Wirtschaftsinformatik-Student, arbeitet im Reporting-Umfeld, kennt Datasphere-Begriffe,
hat aber noch nicht selbst modelliert).

## Feste Rahmenbedingungen

- Nur Desktop-Browser (PC), kein Mobile-Layout nötig
- Spieltexte und UI **komplett Englisch** (wie die echte Datasphere-Oberfläche)
- Projektdokumentation (diese Dateien) auf Deutsch
- **Grundlage ist der Aufbau von Datasphere, nicht SQL:** gleiche Apps, Namen und Abläufe (Seitennavigation, Space wählen,
  Objektliste, Save/Deploy, Properties-Panel). Eigener Look, keine SAP-Logos
- Modellierung per **SQL View**, keine Graphical Views (Kachel zeigt nur Erklärung)
- Standard-SQL via DuckDB-WASM; HANA-Unterschiede nur als Info-Karten
- Ruhige Business-Simulation mit Karriere-Rängen und Badges, keine laute Spieloptik
- Tipps frei nutzbar, kosten aber XP; nie eine fertige Lösung anzeigen
- Start mit 0 XP; jede Mission hat ein kostenloses Tutorial-Popup, das Schritt für Schritt alles erklärt
- Mentor im Spiel: Calin Mucea
- Tipp-Stufen je Kapitel (`guidance`): 0–1 alle offen, 2–4 nur Richtung frei, 5–10 nur gegen XP, 11 keine
- Keine SAP-Logos, keine pixelgenaue Kopie der SAP-Oberfläche (Struktur echt, Optik eigenständig)

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
docs/HANDBUCH_ABGLEICH.md ← Abgleich mit Curlins SAP-Datasphere-Handbuch: was abgedeckt ist, was dort „nicht verifiziert“ ist
src/main.ts          ← Shell (Shellbar, Seitennavigation), Routing, Home, App-Infoseiten, Glossar, Missions-Panel, Boot
src/ctx.ts           ← gemeinsamer Zustand + Callbacks für die Views (vermeidet Import-Zyklen)
src/ui.ts            ← Helfer: esc, Layer-Farben, Icons, Dialog, Toast, Ergebnistabelle
src/content/apps.ts  ← App-Katalog der Seitennavigation (Name, Gruppe, Zweck, ab welchem Kapitel interaktiv) + „New“-Kacheln des Data Builders
src/views/builder.ts ← Data Builder: Space-Auswahl → Startseite (New-Kacheln, Objektliste, geteilte Objekte) → Editoren (Tabelle, SQL View)
src/views/repository.ts ← Repository Explorer: Suche/Filter über alle Spaces, öffnet Objekte im Data Builder
src/views/spaces.ts  ← Space Management (Kacheln, Anlegen/Bearbeiten/Löschen)
src/views/security.ts ← Security (Roles, Users)
src/views/connections.ts ← Connections: Space-Auswahl, Liste, Create (Typ-Auswahl mit Features), Edit, Validate, Delete
src/views/monitor.ts ← Data Integration Monitor: Remote Tables (Snapshot, Remove, Schedule), Flows (Run, Schedule, Lauf-Log), Remote Queries, Consent
src/views/system.ts  ← System: Configuration (Security = Zertifikate, Data Integration = Cloud Connector; Rest Info), About
src/views/flow.ts    ← Data Builder: „Import Remote Tables“-Dialog, Replication-Flow-Editor, `flowError` (Deploy-Prüfung)
src/integration.ts   ← Kapitel 3: Verbindungstypen + Features, Quellsysteme, validateConnection, Remote Tables, runFlow, truncateRisk, Space-Sperre (`lockError`), Wiederherstellung nach Reload
src/repo.ts          ← Repository-Objekte: Business/Technical Name, Status (Not Deployed / Changes to Deploy / Deployed), Deploy, Wiederherstellen nach Reload
src/db.ts            ← DuckDB-WASM: initDb, runSql, exec, listObjects (Spaces = DuckDB-Schemas)
src/editor.ts        ← CodeMirror-SQL-Editor, Strg+Enter, Schema-Autocomplete, Farben über CSS-Variablen
src/data/generator.ts ← Datengenerator (fester Seed, eingebaute Fehler) + datasetToSql, lädt RHN_IN beim Start
src/content/chapters.ts ← Kapitel, Ränge, Glossar
src/content/tutorials.ts ← TUTORIALS (Einstieg je Mission) + TASK_TOURS (Show-me je Aufgabenschritt) – jede neue Mission braucht beides!
src/content/missions/ ← Missionen je Kapitel (`c00.ts` … `c04.ts`), Reihenfolge in `index.ts`; Missionen können ein `setup` haben (einmalige Startsituation)
src/missions/types.ts ← Missions-Format: Ticket, Tasks, Hints, Checks (result/structure/question/rule), Review-Regeln, XP
src/missions/engine.ts ← Prüf-Engine: Ergebnis (SQL im SQL-View-Editor vs. Musterlösung, `diagnose`), Struktur, Fragen, Regeln auf Tenant + Ereignissen
src/missions/review.ts ← Review-Regeln von Calin (no_select_star, alias_aggregates, explicit_join, no_logic_in_inbound)
src/progress.ts      ← Spielstand v4 (je Mission inkl. Ereignisse + Tenant), Migration v2/v3, Ränge, Export/Import, `unlockedChapter`
src/tenant.ts        ← Tenant: Spaces (Storage, Priorität), Shares, aktiver Space, Sharing-Sperre `accessError`, Rollen/Zuweisungen
src/security.ts      ← Rollenmodell: GLOBAL_ADMIN, Vorlagen (TEMPLATES), Scoped Roles, `effectiveAccess`
src/content/people.ts ← Personas für Kapitel 2 (Jonas, Calin, Lena, Tim, Sabine, Petra, Markus, Aylin, Nina)
tests/playtest/      ← Headless-Durchläufe je Kapitel (Playwright/Python), vor jedem Commit laufen lassen
src/tutorial.ts      ← Tutorial-Engine: Popup mit Spotlight, Ansicht wechseln, Beispiel in Editor
src/styles.css       ← Design-Tokens (Shell navy, Akzent teal, Layer-Farben IN/HARM/REP), Hell/Dunkel
scripts/data-report.ts ← `npm run data:report`: Zeilen, Fehlerzahlen, Fingerprint der Testdaten
```

## Konventionen

- Objektnamen im Spiel: Präfix `RHN_`, Layer-Kürzel `IN` / `HA` / `REP`, z. B. `RHN_HA_V_CONSUMPTION`
- Spaces: `RHN_IN`, `RHN_HARM`, `RHN_REP`
- Mission-IDs: `c<Kapitel>-m<Nr>`, z. B. `c05-m02`
- Commits auf Englisch, kurz und im Imperativ

## Aktueller Stand

Die Oberfläche folgt seit 09.10.2026 dem Aufbau von SAP Datasphere: Seitennavigation mit den echten Apps (nicht gebaute Apps
zeigen eine Infoseite, was sie tun), Data Builder mit Space-Auswahl, Startseite mit „New“-Kacheln und Objektliste, Editoren mit
Properties-Panel, Save/Deploy/Share/Data Preview; Repository Explorer; Space Management als Kacheln; Security.

Spielbar (21 Missionen):
- Kapitel 0 „Find your way“ (ohne SQL): Apps kennenlernen, Space wählen, Repository Explorer, Save vs. Deploy
- Kapitel 1 Space Concept, Kapitel 2 Users & Roles
- Kapitel 3 Data Integration: Connections, Cloud Connector + Zertifikat, Remote vs. Snapshot, Replication Flows (Delta, Truncate, Projektion), gesperrter Space
- Kapitel 4 Inbound Layer: SQL-Profiling im Scratch-SQL-View

Fachliche Quelle seit 09.10.2026: Curlins Handbuch „SAP Datasphere Handbuch“ (docx, nicht im Repo). Abgleich und offene Punkte: `docs/HANDBUCH_ABGLEICH.md`.

Prüfungen auf Klicks laufen über **Ereignisse** je Mission (`ctx.track`, z. B. `app:builder`, `space:builder:RHN_IN`,
`open:RHN_IN.TARIFFS`, `preview:…`, `preview-in:<Space>:<Objekt>`, `repository-open:…`, `search:repository:…`, `save:…`, `deploy:…`,
Kapitel 3: `create-connection:…`, `validate:<Space>.<Name>:ok|fail`, `import-remote:…`, `snapshot:…`, `schedule:…`, `run:<Flow>:<Status>`,
`monitor:<Tab>`, `monitor-open:<Flow>`, `upload-cert:…`, `unlock:<Space>`, `consent`). Kapitel-3-Prüfungen lesen vor allem den Tenant-Zustand.
Deployte SQL Views werden im Spielstand gespeichert und beim Start wieder angelegt.

Neue Mission anlegen: Eintrag in `src/content/missions/cXX.ts` (Zahlen vorher gegen die Daten prüfen),
`TUTORIALS` + `TASK_TOURS` in `src/content/tutorials.ts` (Ansichten für Touren: App-ID oder `builder:landing|new-view|spaces[:SPACE]`),
Playtest in `tests/playtest/` ergänzen und laufen lassen.

## Nächster Schritt

1. Kapitel 5 (Harmonization): SQL Views in `RHN_HARM` auf geteilten Inbound-Tabellen: Netzgebiete/Tarife mappen, Altschlüssel über
   LEGACY_CUSTOMER_MAP, CRM-Dubletten (jetzt mit `SRC_SYS_ID = 'CRM'`), MWh → kWh, doppelte Ablesungen. Quelle: Handbuch 6.5.2, 6.11.4
2. Glossar-Begriffe beim ersten Kontakt freischalten, erste Badges
3. Offene Punkte aus `docs/HANDBUCH_ABGLEICH.md` am echten Tenant prüfen (Curlin): Reihenfolge der Seitennavigation, eigener Eintrag
   „Data Access Controls“, Gruppe „Monitoring“, Namen der Standardrollen
