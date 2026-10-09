# Entscheidungen – Datasphere Game

Format: Entscheidung · Grund · Datum. Neueste oben.

| Datum | Entscheidung | Grund |
| --- | --- | --- |
| 2026-10-09 | Tutorials hands-on: Schritte warten auf die echte Aktion des Spielers, Seite bleibt bedienbar, Tour geht von selbst weiter | Wunsch von Curlin: „stark guided“; Lernen durch Tun statt Lesen |
| 2026-10-09 | Missions-Tutorial = Intro + Hands-on-Schritte aller Aufgaben + Check; „Show me“ spielt dieselben Schritte einer Aufgabe | Eine Quelle für beide, keine doppelten Texte |
| 2026-10-09 | Ab Kapitel 2 führen Tutorials jeden Klick, Entscheidungen (Rolle, Load Type, Truncate, Datenzugriff) bleiben erklärende Schritte ohne Prüfung | Tutorial soll nicht die Lösung vorgeben |
| 2026-10-09 | Curlins „SAP Datasphere Handbuch“ ist fachliche Quelle; was es als „nicht verifiziert“ markiert, wird vereinfacht gebaut und im Code/Text als vereinfacht gekennzeichnet | Wunsch von Curlin; keine erfundenen Details als Fakten |
| 2026-10-09 | Pilot-Tabellen in RHN_IN bleiben und sind Ziel der Replication Flows; Läufe zählen Datensätze, ändern die Daten aber nicht (Ausnahme: Zusatzspalten aus Projektionen, neue Zieltabellen) | Kapitel 0–2 und 4 bauen auf diesen Tabellen auf; Prüfungen bleiben stabil |
| 2026-10-09 | Truncate auf Tabellen mit Zeilen anderer Quellen (LEGACY) wird beim Run von Lena gestoppt statt Daten zu löschen | Lerneffekt ohne zerstörte Daten für spätere Kapitel |
| 2026-10-09 | Feature-Matrix je Verbindungstyp vereinfacht (Handbuch: nicht verifiziert); Real-Time-Replikation, Data Flows, Data Provisioning Agent nur erklärt | Fokus auf Remote vs. Snapshot vs. Replication Flow |
| 2026-10-09 | Remote Tables als DuckDB-Views auf die Pilot-Tabellen (gefiltert nach SRC_SYS_ID); Remote Queries nur für die laufende Sitzung | Echter Datenzugriff in der Vorschau ohne zweite Datenkopie |
| 2026-10-09 | Connections, Data Integration Monitor und System (Configuration) ab Kapitel 3 interaktiv | Kapitel 3 braucht sie; Handbuch Kap. 3.3, 5, 10 |
| 2026-10-09 | Space-Sperre bei Überschreitung des Disk-Speichers: keine Loads/Deploys bis mehr Speicher + Unlock | Handbuch 4.4.3 und 4.4.11 |
| 2026-10-09 | Missionen können eine einmalige Startsituation (`setup`) haben, Merker in `tenant.scenarios` | c03-m06 beginnt mit einem fehlgeschlagenen Nachtlauf |
| 2026-10-09 | Aufbau/Navigation von Datasphere ist die Grundlage, nicht SQL; neues Kapitel 0 ohne SQL | Wunsch von Curlin: erst lernen, wie Datasphere aufgebaut ist und was welche App macht |
| 2026-10-09 | Echte Struktur (Apps, Namen, Abläufe), eigener Look ohne SAP-Logos | Wunsch von Curlin |
| 2026-10-09 | Nur SQL Views, keine Graphical Views; die Kachel erklärt nur | Wunsch von Curlin |
| 2026-10-09 | Alte Kapitel-0-SQL-Missionen werden Kapitel 4 (Inbound-Profiling), Spielstand v3→v4 benennt c00→c04 um | Wunsch von Curlin; Fortschritt bleibt erhalten |
| 2026-10-09 | Nicht gebaute Apps öffnen eine Infoseite (Zweck, wer arbeitet dort, ab welchem Kapitel) statt gesperrt zu sein | Navigation lernt man nur, wenn man überall hinklicken kann |
| 2026-10-09 | Data Access Controls als „New“-Kachel im Data Builder, keine eigene App | Neuere Releases legen DACs im Data Builder an; ältere Tenants hatten eine eigene App – gegen echten Tenant prüfen |
| 2026-10-09 | Klick-Prüfungen über Ereignisse je Mission (`ctx.track`) | Navigation ist sonst nicht prüfbar; Ereignisse zählen nur, während die Mission offen ist |
| 2026-10-09 | Save/Deploy mit drei Status wie im echten System; Technischer Name fix nach dem ersten Speichern | Zentrales Lernziel; einfache, eindeutige Regel |
| 2026-10-09 | Freischaltungen richten sich auch nach dem höchsten komplett gelösten Kapitel (`unlockedChapter`) | Nach der Migration bleiben Security & Co. nutzbar |
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
