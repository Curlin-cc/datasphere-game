# Playtests

Headless-Durchläufe je Kapitel mit Playwright (Python): spielen jede Mission mit typischen Fehlern und mit
richtiger Lösung und geben die Rückmeldungen der Prüfung aus. Erwartung: jede Mission endet mit `GAIN`, `ERRORS []`
(Schrift-Ladefehler ohne Internet sind egal).

```
npx vite --port 5199 --strictPort &      # Dev-Server
pip install playwright && playwright install chromium
cd tests/playtest && python3 chapter0.py /tmp   # Argument: Ordner für Screenshots
```

Gemeinsame Helfer in `common.py` (`Game`, `save_before`, ab Kapitel 5 auch `space`, `share`, `new_view`, `edit_view`). Kapitel 1, 2 und 4 setzen den Spielstand vorher per localStorage,
laufen also unabhängig voneinander; `chapter4.py` prüft zusätzlich die Migration v3 → v4.
Aus dem Ordner `tests/playtest/` starten, damit `common.py` gefunden wird.
Neue Missionen: Skript für das Kapitel ergänzen, bevor committet wird.
Kapitel 5: `chapter5.py` baut alle Views mit typischen Fehlern; SQL und Startzustand in `chapter5_data.py` (auch von `guided.py` genutzt).
Kapitel 6: `chapter6.py` (Startzustand mit den Kapitel-5-Views in `chapter6_data.py`), Helfer `Game.semantics(usage, roles, assoc)`.
Design: `look.py <ordner> [dark]` macht Screenshots aller Hauptseiten zum Vergleich mit `docs/design/screenshots/` (keine Prüfung).
Kapitel 7: `chapter7.py` (Startzustand mit Dimensionen und Facts in `chapter7_data.py`), baut beide Analytic Models mit typischen Fehlern; `guided.py` spielt c07-m01.
Kapitel 8: `chapter8.py` (Startzustand mit beiden Analytic Models in `chapter8_data.py`): Berechtigungstabelle, DAC, Zuweisung, Prüfung als Benutzer; `guided.py` spielt c08-m01.
Kapitel 9: `chapter9.py` (Startzustand nach Kapitel 8 mit DAC auf beiden Facts in `chapter9_data.py`): Tracing, Statement Logs, View Analyzer, Persistenz falsch (Fact) und richtig (Ablesungen), Zeitplan, Reload, DAC-Grenze, Rückbau `RHN_HA_V_TARIFFS`; `guided.py` spielt c09-m02.
Kapitel 10: `chapter10.py` (Startzustand nach Kapitel 9 in `chapter10_data.py`; Verbindungen/Flows aus Kapitel 3 ergänzt das Missions-Setup): Kette in RHN_IN, Delta-Flow abgewiesen, Teilen, Nachtkette (falsche Reihenfolge zuerst), Fehlerlauf und Fix, Task Logs; `guided.py` spielt c10-m01.
Kapitel 11: `chapter11.py` (Startzustand nach Kapitel 10 mit beiden Ketten in `chapter11_data.py`): Monat als Datum (falsch) und als Text, Attribut im Modell, Zusatz-View für Markus (falsch) und Löschen, Nachtlauf.
Kapitel 12: `chapter12.py` (Startzustand `chapter12_data.py` = Stand nach Kapitel 10/11): Kunden mit freigegeben + Benutzer mit Schreibrecht (falsch), Paket nur mit Modell (Export scheitert), nur Production (falsch), Katalog ohne Beschreibung und mit unveröffentlichtem Begriff, Business Builder ohne Perspektiven; `guided.py` spielt c12-m02.
Kapitel 12 Hierarchien: `chapter12_hier.py` (Start wie Kapitel 12, m01–m04 gelöst): Baum ohne Präfix (doppelte Knoten), Assoziation, Knotentabelle mit Netzgebieten, DAC erst Single Values, alte DAC noch zugewiesen, dann richtig.
Kapitel 12 Versionshistorie: `chapter12_ver.py` (Start wie Kapitel 12, m01–m06 gelöst): Prüfen ohne Änderung, Fix von Hand (Regel „Versionshistorie benutzt“ fehlt), Tims Version wiederherstellen, dann das Hands-on-Tutorial (Versions, Vergleich, Restore, Deploy) und Reload.
Kapitel 12 OData: `chapter12_odata.py` (Start wie Kapitel 12, m01–m07 gelöst): API-Access-Client (401), falsche Redirect URI (400), nicht freigegeben (404), dann 200; Reload; zweiter Lauf mit Hands-on-Tutorial.
Alle auf einmal: `bash run_all.sh <ordner> [skript …]` (eine Zeile je Skript, Exit-Code 1 bei Traceback oder Seitenfehler).
Kapitel 12 Content Network: `chapter12_onb.py` (m01–m08 gelöst): Partnerpaket (Lizenz), Sample (läuft), Utilities-Paket per Hands-on-Tutorial, Import-Log, Repository Explorer, Re-Import ohne Overwrite, Reload.
Design Exkurse: `look_exc.py <ordner> [dark] [1366x768]` fotografiert Semantic Onboarding, App Integration, Security-Seiten, Versionen, Settings und misst seitlichen Überlauf.
Kapitel 12 Data Flow: `chapter12_df.py` (m01–m09 gelöst): ohne Aggregation + Append (Zeilenlimit), Append doppelt, dann Truncate; Reload, Monitor; zweiter Lauf mit Hands-on-Tutorial.
Kapitel 5 Mapping-Tabelle: `chapter5_map.py` löst c05-m01 über `RHN_HA_T_CODE_MAP` (New Table, Data Editor) statt CASE: inner Join, ohne COALESCE, dann richtig, mit Reload.
Kapitel 12 Transformation Flow: `chapter12_tf.py` (m01–m10 gelöst): Initial and Delta ohne Delta Capture (Deploy abgelehnt), Initial Only (Volllast je Lauf), Delta Capture an, Erstladung (setzt den Schlüssel im Ziel), Bankmeldung nur gespeichert, dann deployt + Delta-Lauf (1 I, 1 U, 1 D), Nacht ohne Änderungen; Reload, Monitor, Task Logs, Kettenschritt; zweiter Lauf mit Hands-on-Tutorial.
Kapitel 12 Nachtlauf: `chapter12_tf2.py` löst c12-m11 per UI, dann c12-m12 (Setup löscht den 12.02. im Ziel, PAY-0097 neu in der Quelle): nur Delta-Lauf (fehlen weiter), Reset Delta + Lauf (vollständig), Kettenschritt nur gespeichert, deployt, Kette gelaufen; Reload; zweiter Lauf mit Hands-on-Tutorial. Gemeinsames in `chapter12_tf_data.py`.
