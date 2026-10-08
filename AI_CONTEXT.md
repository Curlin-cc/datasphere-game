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
- Modellierung per **SQL**, kein Drag & Drop
- Standard-SQL via DuckDB-WASM; HANA-Unterschiede nur als Info-Karten
- Ruhige Business-Simulation mit Karriere-Rängen und Badges, keine laute Spieloptik
- Tipps frei nutzbar, kosten aber XP; nie eine fertige Lösung anzeigen
- Start mit 0 XP; jede Mission hat ein kostenloses Tutorial-Popup, das Schritt für Schritt alles erklärt
- Mentor im Spiel: Calin Mucea
- Tipp-Stufen je Kapitel (`guidance`): 0–1 alle offen, 2–4 nur Richtung frei, 5–10 nur gegen XP, 11 keine
- Keine SAP-Logos, keine 1:1-Kopie der SAP-Oberfläche (nur Fiori/Horizon-inspiriert)

## Stack (geplant)

| Baustein | Wahl |
| --- | --- |
| Gerüst | Vite + TypeScript, kein großes UI-Framework |
| SQL | DuckDB-WASM |
| Editor | CodeMirror 6 |
| Inhalte | `content/missions/*.json`, datengetrieben |
| Spielstand | localStorage + JSON-Export/Import |
| Testdaten | Generator-Skript mit festem Seed |
| Hosting | privates claude.ai-Artifact (`npm run build:artifact`), Repo bleibt privat |

## Ordnerstruktur (Ziel)

```
AI_CONTEXT.md        ← du bist hier
docs/PLAN.md         ← vollständiger Plan (Kapitel, Mechaniken, Architektur)
docs/STATUS.md       ← Checkliste + Session-Log
docs/DECISIONS.md    ← Architektur-Entscheidungen
docs/DATA.md         ← Testdaten: Tabellen, eingebaute Fehler, Zahlen
src/main.ts          ← App-Rahmen, Views (Home, Space Mgmt, Data Builder, Glossary, gesperrte Views), Missions-Panel
src/db.ts            ← DuckDB-WASM: initDb, runSql, exec, listObjects (Spaces = DuckDB-Schemas)
src/editor.ts        ← CodeMirror-SQL-Editor, Strg+Enter, Schema-Autocomplete, Farben über CSS-Variablen
src/data/generator.ts ← Datengenerator (fester Seed, eingebaute Fehler) + datasetToSql, lädt RHN_IN beim Start
src/content/chapters.ts ← Kapitel, Ränge, Glossar
src/content/tutorials.ts ← TUTORIALS (Einstieg je Mission) + TASK_TOURS (Show-me je Aufgabenschritt) – jede neue Mission braucht beides!
src/content/missions/ ← Missionen je Kapitel (`c00.ts`, `c01.ts`), Reihenfolge in `index.ts`
src/missions/types.ts ← Missions-Format: Ticket, Tasks, Hints, Checks (result/structure/question/rule), Review-Regeln, XP
src/missions/engine.ts ← Prüf-Engine: führt letzte Anweisung im Editor aus, vergleicht mit Musterlösung(en), `diagnose` für typische Fehler
src/missions/review.ts ← Review-Regeln von Calin (no_select_star, alias_aggregates, explicit_join, no_logic_in_inbound)
src/progress.ts      ← Spielstand v3 (je Mission + Tenant), Ränge (RANK_XP), Export/Import
src/tenant.ts        ← Tenant: Spaces (Storage, Priorität), Shares, aktiver Space, Sharing-Sperre `accessError`
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

Phase 1 (Fundament) fertig. Kapitel 0 (Onboarding) und Kapitel 1 (Space Concept) sind spielbar, je 4 Missionen mit
automatischer Prüfung, Fragen, Review, XP und Rängen, Spielstand mit Export/Import. Kapitel 1 bringt das Tenant-Modell:
Spaces anlegen, Storage und Priorität, Objekte zwischen Spaces teilen; der Data Builder arbeitet immer in einem aktiven Space.
Achtung: Views, die der Spieler per SQL anlegt, leben nur in DuckDB und sind nach dem Neuladen weg – vor Kapitel 4/5 lösen. Datengenerator: 7 Tabellen in
`RHN_IN` mit eingebauten Fehlern, Details in `docs/DATA.md`. Lokal starten: `npm install`, `npm run dev`.

Neue Mission anlegen: Eintrag in `src/content/missions/cXX.ts` (Zahlen vorher gegen die Daten prüfen),
`TUTORIALS` + `TASK_TOURS` in `src/content/tutorials.ts`, im Browser mit richtiger und falscher Lösung durchspielen.

## Nächster Schritt

1. Kapitel 2 (Users & Roles): Security-Ansicht mit 8 Personas, Rollen (DW Administrator, Space Administrator,
   Integrator, Modeler, Viewer, Consumer) und Scoped Roles je Space; Prüfung per `rule`-Checks (Least Privilege)
2. Vom Spieler angelegte Objekte (CREATE VIEW/TABLE) im Spielstand speichern und beim Start wieder anlegen
3. Glossar-Begriffe beim ersten Kontakt freischalten, erste Badges
