# Datasphere Game – Einstieg für jede Session

1. Lies zuerst `AI_CONTEXT.md` (Projekt, Regeln, Struktur, nächster Schritt) und `docs/STATUS.md`.
2. **Fachliche Quelle ist Curlins SAP-Datasphere-Handbuch** in `docs/handbuch/`: `README.md` ist das Inhaltsverzeichnis
   mit der Zuordnung Spielkapitel → Handbuch-Kapitel, die Kapitel liegen als Markdown daneben, das Original als
   `SAP_Datasphere_Handbuch.docx`. Vor jeder neuen Mission die passenden Handbuch-Kapitel lesen. Was dort als
   „nicht verifiziert“ markiert ist, nur vereinfacht bauen und kennzeichnen. Abgleich: `docs/HANDBUCH_ABGLEICH.md`.
3. **Design ist verbindlich:** Die Oberfläche folgt dem heutigen Aussehen von SAP Datasphere (Theme Horizon). Vor **jeder** UI-Arbeit
   `docs/design/README.md` lesen (Shell, Navigation, Farben, Seitentypen, offene Abweichungen) und den passenden Screenshot in
   `docs/design/screenshots/` ansehen; Beschriftungen und Positionen stehen in `docs/design/BILDBESCHREIBUNGEN.md`. Keine SAP-Logos/-Bilder.
   Nach dem Bauen Playtest-Screenshot mit dem Original vergleichen.
4. Spieltexte Englisch, Projektdoku Deutsch. Vor jedem Commit die Playtests in `tests/playtest/` laufen lassen.
5. Am Ende der Session `docs/STATUS.md`, `AI_CONTEXT.md` („Nächster Schritt“) und ggf. `docs/DECISIONS.md` aktualisieren,
   dann direkt auf `main` committen und pushen.
