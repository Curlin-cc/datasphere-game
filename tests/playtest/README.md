# Playtests

Headless-Durchläufe je Kapitel mit Playwright (Python): spielen jede Mission mit typischen Fehlern und mit
richtiger Lösung und geben die Rückmeldungen der Prüfung aus. Erwartung: jede Mission endet mit `GAIN`, `ERRORS []`
(Schrift-Ladefehler ohne Internet sind egal).

```
npx vite --port 5199 --strictPort &      # Dev-Server
pip install playwright && playwright install chromium
python3 tests/playtest/chapter0.py /tmp   # Argument: Ordner für Screenshots
```

Kapitel 1 und 2 setzen den Spielstand vorher per localStorage, laufen also unabhängig voneinander.
Neue Missionen: Skript für das Kapitel ergänzen, bevor committet wird.
