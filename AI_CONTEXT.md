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
| Hosting | GitHub Pages |

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
src/content/tutorials.ts ← Tutorial-Schritte je Mission-ID (jede neue Mission braucht eins!)
src/tutorial.ts      ← Tutorial-Engine: Popup mit Spotlight, Ansicht wechseln, Beispiel in Editor
src/styles.css       ← Design-Tokens (Shell navy, Akzent teal, Layer-Farben IN/HARM/REP), Hell/Dunkel
content/missions/    ← eine JSON-Datei pro Mission (noch nicht angelegt)
scripts/data-report.ts ← `npm run data:report`: Zeilen, Fehlerzahlen, Fingerprint der Testdaten
```

## Konventionen

- Objektnamen im Spiel: Präfix `RHN_`, Layer-Kürzel `IN` / `HA` / `REP`, z. B. `RHN_HA_V_CONSUMPTION`
- Spaces: `RHN_IN`, `RHN_HARM`, `RHN_REP`
- Mission-IDs: `c<Kapitel>-m<Nr>`, z. B. `c05-m02`
- Commits auf Englisch, kurz und im Imperativ

## Aktueller Stand

Phase 1 (Fundament) läuft. App-Gerüst steht: Layout, DuckDB im Browser, SQL-Editor mit Ergebnistabelle,
eine Vorschau-Mission (Kapitel 0) mit Tipps, aber ohne automatische Prüfung. Datengenerator fertig:
7 Tabellen in `RHN_IN` mit eingebauten Fehlern, Details in `docs/DATA.md`. Lokal starten: `npm install`, `npm run dev`.

## Nächster Schritt

1. Missions-Format (`content/missions/*.json`) + Prüf-Engine (Ergebnis, Struktur, Review)
2. Spielstand in localStorage + Export/Import, XP-Abzug für Tipps
3. Kapitel-0-Missionen auf die neuen Daten schreiben (Zahlen aus `docs/DATA.md`)
