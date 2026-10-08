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
src/                 ← App-Code (noch nicht angelegt)
content/missions/    ← eine JSON-Datei pro Mission (noch nicht angelegt)
scripts/             ← Datengenerator (noch nicht angelegt)
```

## Konventionen

- Objektnamen im Spiel: Präfix `RHN_`, Layer-Kürzel `IN` / `HA` / `REP`, z. B. `RHN_HA_V_CONSUMPTION`
- Spaces: `RHN_IN`, `RHN_HARM`, `RHN_REP`
- Mission-IDs: `c<Kapitel>-m<Nr>`, z. B. `c05-m02`
- Commits auf Englisch, kurz und im Imperativ

## Aktueller Stand

Phase 1 (Fundament) begonnen: Planung abgeschlossen, Gedächtnis-Dateien angelegt. Noch kein App-Code.

## Nächster Schritt

App-Gerüst anlegen: Vite + TypeScript, DuckDB-WASM laden, ein SQL-Editor mit Ergebnistabelle,
Grundlayout (Navigation links, Arbeitsbereich Mitte, Missions-Panel rechts).
