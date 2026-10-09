# Fragen an Curlin (am echten Tenant klären)

> Wunsch von Curlin (10.10.2026): offene Punkte hier sammeln, weiterbauen und **am Ende jeder Session nach dieser Liste fragen**.
> Erledigte Punkte mit Antwort und Datum abhaken, nicht löschen. Wo eine Antwort das Spiel ändert, den Umbau in `AI_CONTEXT.md` („Nächster Schritt“) eintragen.

## Screenshots für das Design (`docs/design/screenshots/`, nächste Nummer ab 22)

- [ ] **Connections**: Willkommensseite und Liste einer Space. Bild 12 zeigt in Wahrheit das Translation Dashboard.
- [ ] **Security › Users** und **Security › Roles**: im Spiel im Listenstil von Task Logs (Typ D) angenommen.
- [ ] **Security › Activities** und, falls vorhanden, **Authorization Overview**. Bild 20 zeigt nur Activities als Unterpunkt; welche Unterpunkte siehst du mit deiner Rolle?
- [ ] **Transport › Packages** und **Transport › Export** (nur Import und Monitor liegen vor, Bild 13/16).
- [ ] **Benutzermenü am Avatar**: heißen die Einträge Settings · About · Sign Out?

## Fachliche Prüfpunkte (aus `docs/HANDBUCH_ABGLEICH.md`)

- [ ] *Expose for Consumption*: genauer Schaltertext und Position (Bild 21 zeigt ihn im Properties-Panel).
- [ ] Transport: dürfen Pakete Objekte **mehrerer Spaces** enthalten? (Spiel: nein, andere Spaces über erforderliche Pakete)
- [ ] Wirken **DACs für Datenbankbenutzer** (Power BI über `SPACE#SUFFIX`)?
- [ ] Analytic Model: dürfen **Restricted Measures auf Calculated Measures** aufsetzen?
- [ ] Wendet die **Data Preview im Data Builder die DAC des Modellierers** an?
- [ ] Persistenz: ist ein **View mit eigener DAC persistierbar**? (Spiel: ja) Entfernt ein **erneutes Deploy** die persistierten Daten?
- [ ] Task Chains: erreichen sie Objekte **anderer Spaces nur über geteilte Ketten**?
- [ ] Versionshistorie (Handbuch 11.4.9): Wie heißt der Knopf im Editor (Spiel: **Versions** neben Details)? Muss eine **wiederhergestellte Version erneut deployt** werden? Wie viele Versionen bleiben erhalten? Gibt es einen Vergleich zweier Versionen? (Screenshot wäre ideal)
- [ ] Standardrollen: welche Rollen-Vorlagen gibt es im Tenant wirklich (Handbuch belegt nur DW Administrator, DW Viewer, Catalog User)?

## Erledigt

(noch nichts)
