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
