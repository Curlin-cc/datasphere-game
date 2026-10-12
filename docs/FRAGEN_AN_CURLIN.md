# Fragen an Curlin (am echten Tenant klären)

> Wunsch von Curlin (10.10.2026): offene Punkte hier sammeln, weiterbauen und **am Ende jeder Session nach dieser Liste fragen**.
> Erledigte Punkte mit Antwort und Datum abhaken, nicht löschen. Wo eine Antwort das Spiel ändert, den Umbau in `AI_CONTEXT.md` („Nächster Schritt“) eintragen.
> Legende der Antworten von Curlin: ✅ in der SAP-Doku nachgelesen · 🟡 sein Wissensstand, am Tenant noch zu bestätigen · ❌ nur am Tenant/per Screenshot.

## Screenshots für das Design (`docs/design/screenshots/`, nächste Nummer ab 22)

- [ ] **Connections**: Willkommensseite und Liste einer Space. Bild 12 zeigt in Wahrheit das Translation Dashboard.
- [ ] **Security › Users** und **Security › Roles**: im Spiel im Listenstil von Task Logs (Typ D) angenommen.
- [ ] **Security › Activities** und, falls vorhanden, **Authorization Overview**. Bild 20 zeigt nur Activities als Unterpunkt; welche Unterpunkte siehst du mit deiner Rolle?
- [ ] **Transport › Packages** und **Transport › Export** (nur Import und Monitor liegen vor, Bild 13/16).
- [ ] **Benutzermenü am Avatar**: heißen die Einträge Settings · About · Sign Out?
- [ ] **Neue Apps (12.10.2026)**: Screenshots von *Elastic Compute Nodes*, *Marketplace Data Products*, *Data Sharing Cockpit* und einer Space in *Translation* (nach der Space-Wahl), falls dein Tenant sie zeigt; dazu Capacities › Reiter *Spaces* und System and Spaces › Reiter *Object Store*. Gebaut ist alles nur nach Handbuch + Bild 4/5/12.
- [ ] **Editoren als Screenshot**: Data Flow (Canvas, Operatoren, Ziel-Eigenschaften), Transformation Flow (View Transform, Target Table, Eigenschaften), Tabellen-Editor mit dem Schalter **Delta Capture**.

## Fachliche Prüfpunkte, noch offen

- [ ] *Expose for Consumption*: in welcher Sektion des Properties-Panels (Output-Knoten) sitzt der Schalter? (🟡 Name stimmt, Position offen)
- [ ] Wirken **DACs für Datenbankbenutzer** (Power BI über `SPACE#SUFFIX`)? Test: eine View mit DAC per DB-User abfragen: gefiltert, alles oder nichts? (❌)
- [ ] Analytic Model: dürfen **Restricted Measures auf Calculated Measures** aufsetzen? (❌, Spiel: ja)
- [ ] Wendet die **Data Preview im Data Builder die DAC des Modellierers** an? (🟡 wahrscheinlich ja, bitte gegenprüfen)
- [ ] Persistenz: (🟡) View mit eigener DAC persistierbar, DAC greift beim Lesen? Verwirft ein **erneutes Deploy** die persistierten Daten?
- [ ] Versionshistorie („Reviewing and Restoring Object Versions“): Name des Knopfs (Spiel: **Versions**), muss nach dem Wiederherstellen neu deployt werden, wie viele Versionen bleiben, gibt es einen Vergleich? Screenshot ideal (❌)
- [ ] Semantic Onboarding › Import Options: gibt es neben *Import Schedule* und *Overwrite Preferences* eine Option **Deploy after import**? (❌)
- [ ] Data Flow: heißen die Zielmodi **Append / Truncate / Delete** (mit Option *Update Records by Primary Key (UPSERT)* bei Append)? (🟡)
- [ ] Transformation Flow: ersetzt oder hängt **Initial Only** bei jedem Lauf an? Darf die Delta-Quelle eine **geteilte Tabelle eines anderen Space** sein (Spiel: ja)? (❌) Heißt die Aktion im Monitor wirklich **Reset Watermark**? (🟡 von Curlin vermutet; SAP-Release 2024.2 spricht vom Zurücksetzen des Watermarks – seit 12.10.2026 im Spiel so benannt)
- [ ] **E-Mail bei Fehlern eines Replication Flows** (c03-m06, richtige Antwort im Spiel): gibt es die im Monitor › Flows? Handbuch 10.3.5 sagt ja, in der SAP Community hieß es im Januar 2025 „noch nicht vorhanden“ (nur Task Chains).
- [ ] **Analytic Model mit mehreren Facts**: inzwischen möglich? Stand Mitte 2025 bei SAP „Roadmap“; c07-m05 fragt nach „genau ein Fact“.

## Erledigt

- [x] **Standardrollen** (Antwort 12.10.2026, ✅): Vorlagen System Owner, DW Administrator; DW Space Administrator, DW Integrator, DW Modeler, DW Viewer, DW Consumer, zu diesen fünf je eine vordefinierte „DW Scoped …“-Variante; DW Metadata Graph Consumer, Catalog Administrator, Catalog User. Standardrollen sind nicht änderbar/löschbar, nur Vorlage; Security › Roles mit Filtern *License Type = SAP Datasphere*, *Role Type = Standard Role*. DW Administrator hat **keinen Zugriff auf die Apps** (z. B. Data Builder), DW Consumer kann sich **nicht an Datasphere anmelden**. → Nächster Schritt in `AI_CONTEXT.md`.
- [x] **Expose for Consumption** (12.10.2026, ✅ Name): Schalter heißt genau so; Datenbankbenutzer lesen nur Views mit aktivem Schalter. Position siehe offener Punkt oben.
- [x] **Transport über mehrere Spaces** (12.10.2026, 🟡): nein, ein Paket gehört zu einem Space, andere Spaces über *Required Packages* – wie im Spiel. ✅ Exportieren darf DW Administrator oder scoped DW Space Administrator plus globales Lifecycle-Recht.
- [x] **Persistenz-Refresh** (12.10.2026, ✅): jeder Refresh legt eine neue Persistenztabelle an; schlägt der Lauf fehl, bleiben die alten Daten.
- [x] **Task Chains über Space-Grenzen** (12.10.2026, ✅): nur über geteilte Ketten; teilen lassen sich Tabellen, Views, Analytic Models und Task Chains – wie im Spiel.
- [x] **OAuth-Client-Dialog** (12.10.2026, ✅): Felder Name, OAuth Client ID (nach Anlegen, schreibgeschützt), Purpose (*Interactive Usage* · *API Access* · *Technical User*), Authorization Grant (schreibgeschützt, bei Interactive Usage „Authorization Code“), Secret, Redirect URI (Wildcards, CLI `http://localhost:8080/`), Token Lifetime (60 s–1 Tag, Std. 60 Min.), Refresh Token Lifetime (60 s–180 Tage, Std. 30 Tage). Secret nur einmal direkt nach *Add* sichtbar (Clients vor v2024.08: „Show Secret“). → Nächster Schritt.
- [x] **Content Network** (12.10.2026, ✅): Kacheln Business Content, 3rd Party Content, Samples (Samples laut Doku in Datasphere nicht genutzt); Paket mit Übersicht, „How to install this package“, Import Overview; Reiter Import Options mit *Import Schedule* (None / Notify for new content) und *Overwrite Preferences*. „Open Import Logs“ gehört zu *Import Entities* (Space wählen, links Importe mit Start/Dauer/Ergebnis, rechts Meldungen). Pakete können mit globaler Rolle neue Spaces anlegen; manche verlangen einen vorher angelegten Space mit festem Namen. → Nächster Schritt.
- [x] **Data Flow** (12.10.2026, ✅): SAP empfiehlt Replication Flow + Transformation Flow statt Data Flow, der Editor zeigt ein Hinweisbanner; Operatoren Join, Union, Projection, Calculated Column, Aggregation, Python Script.
- [x] **Delta Capture** (12.10.2026, ✅): Schalter beim Anlegen der lokalen Tabelle, nur solange sie **noch nicht deployt** ist und einen Schlüssel hat; nach dem Deploy nicht mehr abschaltbar. Spalten Change Date (UTC) und Change Type (I, U, A = Upsert, Löschwerte z. B. D); gelöschte Sätze bleiben physisch, werden ausgefiltert; Delta-Tabelle `<Tabelle>_Delta`; Delta-Spalten nicht für externe Delta-Replikation (außer Premium Outbound). → Nächster Schritt (c12-m11 schaltet Delta Capture an einer deployten Tabelle ein).
- [x] **Transformation Flow** (12.10.2026, ✅): Ladearten Initial Only / Initial and Delta, Quelle und Ziel lokale Tabellen, große Mengen im Monitor in Batches.
