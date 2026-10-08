# Entscheidungen – Datasphere Game

Format: Entscheidung · Grund · Datum. Neueste oben.

| Datum | Entscheidung | Grund |
| --- | --- | --- |
| 2026-10-08 | Rollenmodell vereinfacht: DW Administrator global, 5 Vorlagen für Scoped Roles, Zuweisung = Rolle + Spaces aus dem Scope; Rollentexte vereinfacht, gegen SAP Help nachprüfen (help.sap.com im Chat nicht abrufbar) | Konzept lernen statt Privilegien-Matrix |
| 2026-10-08 | Eine Scoped Role pro Funktion (dezentraler Ansatz), Spaces je Nutzer | SAP-Community-Empfehlung gegen Rollenwildwuchs |
| 2026-10-08 | Prüfung je Person über effektive Rechte (Vorlage@Space) mit „need“ und „allow“ | Namen der Rollen egal; zulässige Varianten (Calin auch Modeler, Lena auch Modeler in IN) |
| 2026-10-08 | Playtests als Playwright-Skripte im Repo | Jede Mission mit richtiger und falscher Lösung reproduzierbar prüfen |
| 2026-10-08 | Repo bleibt privat; getestet wird als privates claude.ai-Artifact, kein GitHub Pages | Wunsch von Curlin |
| 2026-10-08 | Space-Regeln wie SAP (learning.sap.com, Stand 08.10.2026): ID max. 20 Zeichen A–Z/0–9/_, nicht änderbar; Name max. 30; Priorität 1–5; neue Spaces 2 GB Disk / 1 GB In-Memory | Echtes Verhalten lernen |
| 2026-10-08 | Tenant-Kapazität 128 GB Disk / 32 GB In-Memory, RHN_IN 40/8 mit Priorität 3 | Ergibt eine Rechenaufgabe mit Reserve in c01-m02 |
| 2026-10-08 | Data Builder arbeitet immer in einem aktiven Space; Abfragen auf fremde Spaces nur über Sharing, neue Objekte nur im aktiven Space | Echtes Space-Konzept spürbar machen |
| 2026-10-08 | Space anlegen per Formular statt SQL | Entspricht der echten Oberfläche; SQL bleibt fürs Modellieren |
| 2026-10-08 | Neuer Prüftyp `rule` (Funktion auf dem Tenant-Zustand) | Storage-, Prioritäts- und Sharing-Regeln sind keine Abfrageergebnisse |
| 2026-10-08 | Missionen als TypeScript-Module (`src/content/missions/*.ts`) statt JSON | Typprüfung beim Build, mehrzeiliges SQL und HTML ohne Escaping; Format bleibt rein datengetrieben |
| 2026-10-08 | Ergebnisprüfung ignoriert Spaltennamen und -reihenfolge, Zeilenreihenfolge nur bei `ordered` | Bewertet wird das Ergebnis, nicht der Schreibstil |
| 2026-10-08 | Typische Fehler werden als eigene Abfragen (`diagnose`) hinterlegt und gezielt erklärt | Konkretes Feedback statt „falsch“, ohne die Lösung zu verraten |
| 2026-10-08 | Review-Hinweise lassen eine Mission nie scheitern; saubere Lösung gibt +5 XP | Best Practices belohnen statt bestrafen |
| 2026-10-08 | Ränge ab 0 / 100 / 350 / 750 XP | Nach Kapitel 0 (100–120 XP) erste Beförderung |
| 2026-10-08 | Hilfe nimmt mit den Kapiteln ab: full (0–1), light (2–4), paid (5–10), none (11) | Wunsch von Curlin: anfangs leicht, später nur gegen XP |
| 2026-10-08 | Jeder Aufgabenschritt hat ein „Show me“-Schnelltutorial (2–3 Pop-ups) | Wunsch von Curlin |
| 2026-10-08 | Start mit 0 XP, XP nie unter 0; Tipp nur kaufbar, wenn genug XP da sind | Wunsch von Curlin; XP erst verdienen |
| 2026-10-08 | Jede Mission hat ein kostenloses Tutorial, das alles Nötige erklärt (ohne fertige Lösung, Beispiele auf anderer Tabelle) | Wunsch von Curlin: erst alles erklären |
| 2026-10-08 | Mentor im Spiel: Calin Mucea (Senior Data Architect) | Wunsch von Curlin, sein Spiel |
| 2026-10-08 | Testdaten werden beim Start im Browser erzeugt (fester Seed), nicht als Dateien eingecheckt | Repo bleibt klein, Daten immer passend zum Code; Ladezeit < 1 s |
| 2026-10-08 | Geschäftliches „Heute“ = 2026-07-15 | Ergibt offene, bezahlte und überfällige Rechnungen für Forderungs-Missionen |
| 2026-10-08 | Regionen: NORTH = Netzgebiete NORTH + EAST, SOUTH = SOUTH + WEST | Grundlage für Data Access Controls in Kapitel 8 |
| 2026-10-08 | Projektgedächtnis als Markdown im Repo statt Knowledge-Graph-Tool | Tools wie claude-mem laufen nur lokal mit Claude Code; Projekt zu klein für Graph |
| 2026-10-08 | Standard-SQL via DuckDB-WASM, HANA-Unterschiede als Info-Karten | Kein HANA im Browser verfügbar; Konzepte wichtiger als Dialekt |
| 2026-10-08 | Spieltexte komplett Englisch | Entspricht der echten Datasphere-Oberfläche |
| 2026-10-08 | Nur Desktop | SQL-Schreiben auf dem Handy unpraktisch |
| 2026-10-08 | Tipps frei, kosten XP; nie fertige Lösung | Selbst knobeln ist das Lernziel |
| 2026-10-08 | Business-Simulation mit Karriere und Badges | Arbeitsgefühl statt Quiz |
| 2026-10-08 | Business Case Stadtwerke Rheinau (Energieversorger) | Nah am Arbeitsumfeld (Energie, Abrechnung) |
| 2026-10-08 | SQL statt Drag & Drop | Weniger Aufwand, mehr Lerneffekt |
| 2026-10-08 | Fact-Views + Analytic Model als Standard, Business Builder nur Exkurs | SAP-Empfehlung, Analytical Dataset und Business-Builder-Objekte abgelöst |
