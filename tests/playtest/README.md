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
