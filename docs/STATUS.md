# Status – Datasphere Game

## Phasen

- [x] **Phase 1 – Fundament**
  - [x] Plan erstellt und Entscheidungen getroffen
  - [x] Gedächtnis-Dateien angelegt (AI_CONTEXT, PLAN, STATUS, DECISIONS)
  - [x] App-Gerüst (Vite + TypeScript, Grundlayout mit Navigation, Topbar, Missions-Panel, Hell/Dunkel)
  - [x] DuckDB-WASM + SQL-Editor mit Ergebnistabelle und Autovervollständigung
  - [x] Datengenerator Stadtwerke Rheinau (`src/data/generator.ts`, Doku `docs/DATA.md`)
  - [x] Prüf-Engine (Ergebnis, Struktur, Fragen, Review)
  - [x] Spielstand (localStorage + Export/Import)
  - [x] Testen als claude.ai-Artifact (`npm run build:artifact`); Repo bleibt privat, GitHub Pages entfällt
- [x] **Phase 2 – Prototyp:** Kapitel 0, 1, 2
  - [x] Kapitel 0: 4 Missionen spielbar (Rohdaten, Forderungen, Überfällig-Liste, Regionen-Join)
  - [x] Kapitel 1: Space Concept – 4 Missionen (Spaces anlegen, Storage/Priorität, Sharing, Namenskonvention)
  - [x] Kapitel 2: Users & Roles – 3 Missionen (Scoped Roles je Funktion, 8 Personas nach Least Privilege, Joiner/Mover)
- [ ] **Phase 3 – Datenstrecke:** Kapitel 3, 4, 5
- [ ] **Phase 4 – Reporting:** Kapitel 6, 7, 8
- [ ] **Phase 5 – Betrieb und Abschluss:** Kapitel 9, 10, 11, Exkurse

## Session-Log (neueste oben)

| Datum | Was passiert ist |
| --- | --- |
| 2026-10-08 | Kapitel 2 Users & Roles: Rollenmodell (`src/security.ts`: DW Administrator global, Scoped Roles aus 5 Vorlagen mit Scope, Zuweisung je Space), Personas (`src/content/people.ts`), Security-Ansicht mit Reitern Roles/Users und Dialogen. 3 Missionen mit personenbezogenem Feedback (zu viel/zu wenig). Fix: klebende Tabellenköpfe überdeckten Buttons. Playtest-Skripte für Kapitel 0–2 in `tests/playtest/`, alle 11 Missionen grün |
| 2026-10-08 | Kapitel 1 Space Concept: Tenant-Modell im Spielstand (`src/tenant.ts`: Spaces mit Disk/In-Memory/Priorität 1–5, Shares, aktiver Space), Space Management mit Anlegen/Bearbeiten/Löschen und Kapazitätsbalken, Space-Auswahl und Teilen-Dialog im Data Builder, Sharing-Sperre für Abfragen aus fremden Spaces, neuer Prüftyp `rule`. 4 Missionen mit Tutorials, Show-me-Touren und Glossar-Begriffen, headless durchgespielt (inkl. Fehlversuche), Kapitel 0 als Regressionstest erneut grün |
| 2026-10-08 | Prüf-Engine (`src/missions/`): Ergebnisprüfung unabhängig von Spaltennamen/-reihenfolge, gezielte Fehlermeldungen (`diagnose`), Strukturprüfung, Fragen, Review-Regeln mit Bonus-XP. Spielstand v3 je Mission mit Export/Import/Neustart (`src/progress.ts`), Migration von v2. Kapitel 0 komplett: 4 Missionen mit Tutorials und Show-me-Touren, headless im Browser durchgespielt (richtige und typische falsche Lösungen) |
| 2026-10-08 | Tipp-Stufen je Kapitel (`guidance` in chapters.ts): Kap. 0–1 alle Tipps offen, 2–4 nur erster Tipp frei, 5–10 alle kaufen, 11 keine. „Show me“-Schnelltutorial je Aufgabenschritt (`TASK_TOURS`) |
| 2026-10-08 | Tutorial je Mission: Schritt-für-Schritt-Popup mit Spotlight (`src/tutorial.ts`, Inhalte `src/content/tutorials.ts`), öffnet beim ersten Start, „Show tutorial“ im Missions-Panel. Start mit 0 XP (Spielstand-Key v2) |
| 2026-10-08 | Anleitung („How to play“ beim ersten Start, im Topbar-Button und auf Home), Aufgabenschritte im Missions-Panel. XP: Start mit 50, Tipps nur kaufbar wenn genug XP, Stand in localStorage. Mentor heißt Calin Mucea. Kacheln stärker umrandet |
| 2026-10-08 | Artifact-Build (`npm run build:artifact`): Spiel als privates claude.ai-Artifact testbar, DuckDB-wasm gzip-komprimiert (Dateilimit 15 MB). Link: https://claude.ai/artifact/GqkmcYFaosKzk3zxyAkPMa |
| 2026-10-08 | Datengenerator: 7 Tabellen in RHN_IN (Verträge, Rechnungen, Tarife, Netzgebiete, Ablesungen, CRM, Schlüssel-Mapping), Fehler eingebaut, im Browser getestet (Start ca. 2,4 s) |
| 2026-10-08 | App-Gerüst gebaut: Layout, DuckDB im Browser, SQL-Editor, Vorschau-Mission Kapitel 0 mit Tipps, kleine Vorschau-Daten in RHN_IN |
| 2026-10-08 | Planung abgeschlossen, Repo angelegt, Gedächtnis-Dateien erstellt |
