# Status – Datasphere Game

## Phasen

- [ ] **Phase 1 – Fundament**
  - [x] Plan erstellt und Entscheidungen getroffen
  - [x] Gedächtnis-Dateien angelegt (AI_CONTEXT, PLAN, STATUS, DECISIONS)
  - [x] App-Gerüst (Vite + TypeScript, Grundlayout mit Navigation, Topbar, Missions-Panel, Hell/Dunkel)
  - [x] DuckDB-WASM + SQL-Editor mit Ergebnistabelle und Autovervollständigung
  - [x] Datengenerator Stadtwerke Rheinau (`src/data/generator.ts`, Doku `docs/DATA.md`)
  - [ ] Prüf-Engine (Ergebnis, Struktur, Review)
  - [ ] Spielstand (localStorage + Export/Import)
  - [ ] Deployment auf GitHub Pages (Workflow liegt bereit, Pages muss in den Repo-Einstellungen auf „GitHub Actions“ gestellt werden)
- [ ] **Phase 2 – Prototyp:** Kapitel 0, 1, 2
- [ ] **Phase 3 – Datenstrecke:** Kapitel 3, 4, 5
- [ ] **Phase 4 – Reporting:** Kapitel 6, 7, 8
- [ ] **Phase 5 – Betrieb und Abschluss:** Kapitel 9, 10, 11, Exkurse

## Session-Log (neueste oben)

| Datum | Was passiert ist |
| --- | --- |
| 2026-10-08 | Tipp-Stufen je Kapitel (`guidance` in chapters.ts): Kap. 0–1 alle Tipps offen, 2–4 nur erster Tipp frei, 5–10 alle kaufen, 11 keine. „Show me“-Schnelltutorial je Aufgabenschritt (`TASK_TOURS`) |
| 2026-10-08 | Tutorial je Mission: Schritt-für-Schritt-Popup mit Spotlight (`src/tutorial.ts`, Inhalte `src/content/tutorials.ts`), öffnet beim ersten Start, „Show tutorial“ im Missions-Panel. Start mit 0 XP (Spielstand-Key v2) |
| 2026-10-08 | Anleitung („How to play“ beim ersten Start, im Topbar-Button und auf Home), Aufgabenschritte im Missions-Panel. XP: Start mit 50, Tipps nur kaufbar wenn genug XP, Stand in localStorage. Mentor heißt Calin Mucea. Kacheln stärker umrandet |
| 2026-10-08 | Artifact-Build (`npm run build:artifact`): Spiel als privates claude.ai-Artifact testbar, DuckDB-wasm gzip-komprimiert (Dateilimit 15 MB). Link: https://claude.ai/artifact/GqkmcYFaosKzk3zxyAkPMa |
| 2026-10-08 | Datengenerator: 7 Tabellen in RHN_IN (Verträge, Rechnungen, Tarife, Netzgebiete, Ablesungen, CRM, Schlüssel-Mapping), Fehler eingebaut, im Browser getestet (Start ca. 2,4 s) |
| 2026-10-08 | App-Gerüst gebaut: Layout, DuckDB im Browser, SQL-Editor, Vorschau-Mission Kapitel 0 mit Tipps, kleine Vorschau-Daten in RHN_IN |
| 2026-10-08 | Planung abgeschlossen, Repo angelegt, Gedächtnis-Dateien erstellt |
