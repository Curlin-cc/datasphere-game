# Entscheidungen – Datasphere Game

Format: Entscheidung · Grund · Datum. Neueste oben.

| Datum | Entscheidung | Grund |
| --- | --- | --- |
| 2026-10-09 | Berechtigungstabelle als **lokale Tabelle mit Data Editor** statt SQL-View mit Literalen | Handbuch 9.3.1: Fachbereich pflegt die Berechtigungsentität; Tabelle ist realistisch und ohne SQL-Tricks |
| 2026-10-09 | Lokale Tabellen vereinfacht: Typen String/Integer/Decimal/Date, Key-Kennzeichen, Zeilen im Spielstand; kein Delta Capture, kein CSV-Upload | Reicht für Mapping- und Berechtigungstabellen |
| 2026-10-09 | DAC nur Typ **Single Values** gebaut; Operator and Values (Handbuch: nicht verifiziert) und Hierarchy (keine Hierarchien modelliert) nur erklärt | Keine erfundenen Details |
| 2026-10-09 | Mehrere DACs an einer View werden mit UND verknüpft; mehrere Kriterien einer DAC müssen gemeinsam in einer Zeile der Berechtigungstabelle passen | Vereinfachung, Handbuch schweigt dazu |
| 2026-10-09 | DAC wirkt im Spiel bei „View as“ (Data Preview), in Analytic Models (Fact und Dimensionen) und in Prüfungen; Views auf geschützten Views werden nicht gefiltert, Modellierer sehen ohne „View as“ alles | Echter Tenant filtert auch nachgelagerte Views und die eigene Vorschau; im Spiel gekennzeichnet |
| 2026-10-09 | Berechtigungen auf Netzgebiet (GRID_AREA), nicht Region | Facts halten GRID_AREA; Kriterium muss auf eine Spalte der geschützten View passen. Lehrt zugleich: DAC auf der Dimension schützt keine Zahlen |
| 2026-10-09 | **MSC statt SAP-Logo**: Curlins eigene Marke, Wortmarke im Big-4-Stil + drei steigende Balken in Lila, Weinrot, Orange (`src/brand.ts`, `docs/design/msc-logo.svg`) | Wunsch von Curlin; keine SAP-Marken im Spiel |
| 2026-10-09 | Oberfläche auf Horizon umgebaut, IDs und `data-*`-Attribute der alten Oberfläche bleiben (Tests und Tutorials) | Umbau ohne Bruch der 36 Missionen und Tutorials |
| 2026-10-09 | Monitoring und Catalog & Marketplace starten zugeklappt; Tutorials zeigen erst auf die Gruppe (Ziel „A || B“ in `tutorial.ts`) | Wie Bild 3/17 im echten Tenant |
| 2026-10-09 | Import Remote Tables / CSV als Kacheln hinter einem Trenner statt im Import-Menü | Tutorials aus Kapitel 3 brauchen ein sichtbares Ziel |
| 2026-10-09 | **Optik folgt der echten SAP Datasphere (Horizon)** nach `docs/design/` (Screenshots und Beschreibung von Curlin); ersetzt „eigener Look, Struktur echt, Optik eigenständig“ (Eintrag vom selben Tag weiter unten). Ausnahmen: keine SAP-Logos, -Bilder, -Schriftdateien; Missions-Panel bleibt | Wunsch von Curlin: Wiedererkennen im echten Tenant ist Lernziel |
| 2026-10-09 | Seitennavigation wie im Tenant: Monitoring › (System and Spaces, Capacities, Task Logs, …, Data Integration), Gruppen Apps und Utilities, Security/System unten | Bild 3/9/17 in `docs/design/`; klärt Abgleich-Punkte 1 und 2 |
| 2026-10-09 | Analytic Model als eigener Objekttyp ohne DB-Objekt: Data Preview und Prüfungen erzeugen daraus eine SQL-Abfrage (`modelSql`), die eine Dimension nur joint, wenn die Abfrage sie braucht | Handbuch 6.10: Modell definiert, was Konsumenten sehen; zeigt nebenbei, wann aus einer Association ein Join wird |
| 2026-10-09 | Neuer Prüftyp `model`: fragt das deployte Modell wie SAC ab (Zeilen + Measures), vergleicht nach Spaltennamen, Variablen werden dabei nicht angewendet | Prüft die fachlichen Zahlen unabhängig davon, wie der Spieler die Measures gebaut hat |
| 2026-10-09 | Restricted Measures schränken innerhalb der Aggregation ein (CASE WHEN), Basis darf jede andere Kennzahl sein (auch calculated); Werte nur „in Liste“ | Handbuch nennt keine Details; funktioniert in jedem Drill-down. Vereinfacht gekennzeichnet |
| 2026-10-09 | Variablen nur als Filter Variable (Single Value/Interval, Pflicht/optional); Standard-, Restricted-Measure- und Stichtagsvariable nur im Dialog erklärt | Handbuch 6.10.5; Stichtag „nicht verifiziert“, Eingabeparameter gibt es im Spiel noch nicht |
| 2026-10-09 | Fact eines Modells muss im eigenen Space liegen und deployt sein; Dimensionen werden in ihrer deployten Version gelesen | Wie bei allen Prüfungen ab Kapitel 5: Konsumenten sehen nur Deploytes |
| 2026-10-09 | Neue Dimension im Modell: alle Nicht-Key-Attribute sichtbar; Key kommt vom Fact | Einfacher Einstieg; Sichtbarkeit pro Attribut bleibt änderbar |
| 2026-10-09 | Semantik (Usage, Spaltenrollen, Associations) ist Design-Zeit-Eigenschaft wie SQL: Save → *Changes to Deploy*, Prüfungen lesen die deployte Version | Wie im echten Editor; ein Lernziel weniger zum Umdenken |
| 2026-10-09 | Spaltenrollen je Usage: Fact = Measure/Attribute, Dimension/Text = Key/Attribute, Hierarchy = Parent/Child/Attribute | Handbuch 6.4.1: Spalten von Fact/Dimension sind Kennzahl oder Attribut, dazu Key-Kennzeichen |
| 2026-10-09 | Associations mit fester Kardinalität n:1, Ziele nur deployte Dimension/Text/Hierarchy mit Key | Handbuch 6.5.4 nennt Kardinalität ohne Details; vereinfacht und im Dialog gekennzeichnet |
| 2026-10-09 | Reporting liest auch unbereinigte Stammdaten nur über 1:1-Views in Harmonization (`RHN_HA_V_GRID_AREAS` usw.) | Schichtregel aus Kapitel 1 ohne Ausnahme; spätere Bereinigung an einer Stelle |
| 2026-10-09 | Brutto ist keine Spalte des Rechnungs-Facts, sondern kommt als Calculated Measure im Analytic Model (Kapitel 7) | Versprechen aus c04-m02: Formel einmal als Kennzahl definieren |
| 2026-10-09 | Hierarchy als Semantic Usage wählbar, aber noch ohne Mission | Netzgebiet → Region ist eine Ebenen-Hierarchie; Codes NORTH/SOUTH kommen als Region und Netzgebiet vor, eine Eltern-Kind-Hierarchie wäre verwirrend. Später mit eigenen Knoten-IDs oder als Drill-Pfad im Analytic Model |
| 2026-10-09 | DECIMAL-Werte werden in `runSql` mit ihrer Skala umgerechnet | Arrow liefert DECIMAL unskaliert; Spieler sahen 100-fache Beträge |
| 2026-10-09 | Ab Kapitel 5 prüfen Missionen die **deployte** View (Laufzeitversion), nicht den Editor; gespeicherte, nicht deployte Änderungen werden ausdrücklich gemeldet | Lernziel Save vs. Deploy; im echten System konsumieren andere nur, was deployt ist |
| 2026-10-09 | Ticket gibt die Spaltennamen der View vor, Prüfung vergleicht nach Spaltennamen (nur die geprüften Spalten, zusätzliche erlaubt) | Views sind Schnittstellen für andere; Namen sind Teil des Vertrags. Spart die Permutationssuche über viele Spalten |
| 2026-10-09 | Neuer Prüftyp `metric` (eine Zahl per SQL, z. B. „Verträge ohne Kunde“) | Fachliches Feedback unabhängig davon, wie der Spieler die View schreibt |
| 2026-10-09 | c05-m02 ändert die bestehende View statt eine zweite zu bauen; zweite View auf dieselbe Quelle wird als Kopie gemeldet | Best Practice „Logik einmal zentral“; Status *Changes to Deploy* wird erlebbar |
| 2026-10-09 | Dubletten-Regel: gleiche E-Mail (ohne Groß/Klein) **und** gleiche Adresse, ältester Datensatz bleibt | Daten enthalten 3 echte Namensvettern-Paare mit gleicher E-Mail; Verträge zeigen auf die älteste ID. Lehrt: Regel an den Daten testen |
| 2026-10-09 | Mapping per CASE statt Mapping-Tabelle | Spiel kann noch keine lokalen Tabellen anlegen; Mapping-Tabelle als Best Practice in Debrief/„In the real tenant“ erwähnt |
| 2026-10-09 | Impact and Lineage vereinfacht als Liste im Properties-Panel, berechnet aus `SPACE.OBJEKT`-Referenzen im gespeicherten SQL | Handbuch 6.11.2 beschreibt nur den Zweck; reicht für „vor dem Ändern prüfen, wer es nutzt“ |
| 2026-10-09 | Kapitel-5-Hinweise und Tutorials HANA-kompatibel (ROW_NUMBER in Unterabfrage statt QUALIFY) | Spieler soll SQL lernen, das auch im echten Tenant läuft |
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
