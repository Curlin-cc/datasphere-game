# Design – so sieht SAP Datasphere heute aus (verbindlich)

> **Pflicht für jede Session und jede UI-Änderung.** Bevor Oberfläche gebaut oder geändert wird: diese Datei lesen,
> den passenden Screenshot in `screenshots/` ansehen und den Abschnitt in `BILDBESCHREIBUNGEN.md` lesen.
> Nach dem Bauen einen Playtest-Screenshot machen und neben den Original-Screenshot legen.
> Was hier steht, geht vor älteren Regeln wie „eigener Look“ (siehe `docs/DECISIONS.md`, 09.10.2026).

Quelle: Curlins Screenshots aus einem echten Tenant (anonymisiert), Stand 09.10.2026, Theme **SAP Horizon**
(Settings › Appearance zeigt „Horizon“, Bild 20).

| Datei | Inhalt |
| --- | --- |
| `screenshots/01…21-*.png` | 21 Screenshots, Nummer = Bildnummer in der Beschreibung |
| `BILDBESCHREIBUNGEN.md` | Pro Bild: Gesamtaufbau, Regionen in % (x/y), Positionsverzeichnis aller lesbaren Beschriftungen in Pixeln |
| `quelle/*.docx` | Originale („Datasphere Looks Einzelbalken“, „Bildbeschreibungen detailliert mit Positionen“) |

## Was übernommen wird und was nicht

**Übernehmen:** Aufbau, Anordnung, Seitennavigation mit Gruppen, Seitentypen, Beschriftungen (englisch, wie im Original),
Farben, Abstände, Tabellen- und Kartenstil, Status-Darstellung, Editor-Aufbau. Ziel: Wer das Spiel gespielt hat, findet sich
im echten Tenant sofort zurecht.

**Nicht übernehmen (bleibt anders):**
- Kein SAP-Logo, keine SAP-Wortmarke, keine SAP-Bilder (Hero-Bild, Illustrationen, Blog-Inhalte). An die Stelle des Logos kommt
  **MSC**, Curlins eigene Marke: aus seiner Vorlage vektorisiert (`msc-logo-vorlage-hell.png` / `-dunkel.png` → `msc-logo.svg` hell,
  `msc-logo-dark.svg` dunkel; im Code `src/brand.ts`, Farben über `--msc-*` in `src/styles.css`). Fette Wortmarke plus Ring aus vier
  sich überlappenden Sicheln: Weinrot oben, Lila rechts, Karminrot links, Orange unten. Hell: Wortmarke Navy `#18263A`; dunkel: Wortmarke Weiß, Farben kräftiger. Illustrationen werden schlicht selbst gezeichnet (SVG, Linienstil).
- Keine Schriftdateien von SAP („72“). Schrift: `"72", "Segoe UI", "Helvetica Neue", Arial, sans-serif` – nutzt 72 nur, wenn es lokal installiert ist.
- Das **Missions-Panel rechts** gibt es nur im Spiel. Es wird wie ein Horizon-Seitenpanel gestaltet (weiß, Rahmen links, Kopf wie „Model Properties“), damit es nicht stört.
- Layer-Farben (IN/HARM/REP) nur als kleine Chips, nie als Flächenfarben.
- Der Tenant-Banner zeigt „Stadtwerke Rheinau · Training“ statt eines echten Tenant-Namens.

## 1. Globale Shell (auf jeder Seite)

Von oben nach unten (Bild 1, 3, 17):

1. **Tenant-Banner**: volle Breite, ca. 30 px hoch, Petrol `#07838F`, Text weiß, fett, zentriert (Tenant-Name, z. B. „Quality - Netz“).
2. **Shellbar**: weiß, ca. 52 px, dünne Linie unten `#E5E5E5`.
   - links: Hamburger (Navigation ein/aus), Zurück-Pfeil `‹`, Logo-Platz, dann **App-Symbol + App-Name** (z. B. „Data Builder“), im Editor
     danach ein Trenner und der Objekt-/Space-Name als Breadcrumb
   - rechts: Glocke mit rotem Zähler-Badge, Feedback, Support, Hilfe `?`, Avatar, App-Raster (9 Punkte). Alles als dunkle Linien-Icons ohne Rahmen
3. **Seitennavigation** links, weiß, ca. 250 px, rechts dünne Linie, eigene Scrollleiste. Einträge: Linien-Icon 16 px + Text 14 px `#1D2D3E`.
   Ausgewählt: Hintergrund `#EBF8FF`, abgerundet, blauer Balken links `#0064D9` (3 px), Text fett.
   Untermenüs mit `›` rechts (zu) bzw. aufgeklappt eingerückt ohne Icon.

**Reihenfolge der Seitennavigation** (Bild 3, 9, 17 – das ist der Stand im echten Tenant):

```
Home
Repository Explorer
Monitoring ›            System and Spaces · Capacities · Task Logs · Expensive Statement Logs
                        · Elastic Compute Nodes · Data Integration
Catalog & Marketplace › Search · Marketplace Data Products
Apps ⌄                  (Gruppenüberschrift, grau, klein, einklappbar)
  Semantic Onboarding
  Business Builder
  Data Builder
  Connections
Utilities ⌄             (Gruppenüberschrift)
  Space Management
  Translation
  Transport ›
  Data Sharing Cockpit ›
──────── unten angeheftet, Trennlinie ────────
Security ›
System ›
```

Folgerungen fürs Spiel: Der **Data Integration Monitor** liegt unter *Monitoring › Data Integration*; der **System Monitor** heißt im
Original *Monitoring › System and Spaces* (plus Capacities, Task Logs …). **Data Access Controls** haben keinen eigenen Navigationseintrag,
sie liegen im Data Builder (Kachel und Reiter). Damit sind die offenen Punkte 1 und 2 in `docs/HANDBUCH_ABGLEICH.md` geklärt.

## 2. Farben und Formen (Horizon, aus den Screenshots gemessen)

| Token | Wert | Wo |
| --- | --- | --- |
| Tenant-Banner | `#07838F` | Band ganz oben |
| Shell / Navigation / Karten | `#FFFFFF` | |
| Seitenhintergrund | `#F5F6F7` | Flächen hinter Karten, Kachelleiste im Data Builder, Home |
| Text | `#1D2D3E` | Standardtext, Tabellen |
| Text sekundär | `#556B82` | Untertitel, Feldbeschriftungen („Business Name:“), „Disk for Storage:“ |
| Linien | `#E5E5E5`; Karten-/Feldrahmen `#D9DCE0` | Tabellenzeilen, Kartenränder |
| Marke / Primär | `#0070F2` | Primärbutton („Details“), Kopf des Properties-Panels, Toggle an |
| Link / Auswahl | `#0064D9` | Links, Reiter-Unterstrich, Navigationsbalken, „Refresh“ |
| Auswahl hell | `#EBF8FF` | gewählter Navigationseintrag, markierte Zeile |
| Positiv | `#256F3A` | COMPLETED, Deployed-Haken, „Working“, Speicherbalken grün `#30914C` |
| Negativ | `#AA0808` | FAILED, Fehler |
| Kritisch / Warnung | `#E76500`; Warnfläche `#FFF8D6` | Hinweisboxen („Authorize us …“) |
| Information / läuft | `#0064D9` | RUNNING, „Cold“ |
| Deaktiviert | `#BDD7F5` (Link), `#A9B4BE` (Text) | „Cancel Task“, „Edit Delete Lock“ ohne Auswahl |
| Editor-Zeilennummern | `#EAECEE` | Gutter im SQL-Editor |

Formen: Karten Radius **12 px**, Rahmen 1 px `#D9DCE0`, kein oder sehr leichter Schatten. Buttons Radius **8 px**, Höhe ca. 26–32 px.
Kacheln im Data Builder Radius 12 px, quadratisch ca. 116 × 78 px. Fortschrittsbalken dünn (4 px), grau mit blauer bzw. grüner Füllung.
Toggles: Pille mit Text „OFF“/„ON“ (Bild 3, 21).

Typografie: Seitentitel **fett, 24–26 px, fast schwarz** („Welcome to the Data Builder“, „Task Logs“, „Spaces (86)“);
Erklärsatz darunter 14 px `#556B82`; Kartentitel 14–16 px fett; Tabellenkopf 14 px fett ohne Großbuchstaben; Tabelleninhalt 14 px.

## 3. Seitentypen

### A. Willkommensseite mit Space-Auswahl (Bild 7, 8, 9, 12)
Data Builder, Business Builder, Data Integration Monitor und Connections beginnen gleich:
- weißer Kopfbereich: H1 **„Welcome to the &lt;App&gt;“** + ein Erklärsatz
- darunter grauer Bereich `#F5F6F7`, zweigeteilt: links eine Illustration mit Hinweistext (z. B. „No space selected“), rechts
  **„Spaces (n)“** mit Suchfeld rechts oben und einem **Kartenraster, 3 Spalten**
- Space-Karte: Name fett (2 Zeilen möglich), technische ID darunter, Trennlinie, „Disk for Storage:“ (grau), „x MB of y GB“, dünner Balken

### B. Data Builder – Startseite eines Space (Bild 17, 18, 19)
1. Kopf: „Welcome to the Data Builder“ + Satz „Load data into tables, prepare and model it in views, and combine it in tightly-focused analytic models …“
2. **Reiter**: All Files · Tables · Views · E/R Models · Analytic Models · Flows · Intelligent Lookups · Task Chains · Data Access Controls (aktiv: blau, Unterstrich)
3. **Kachelleiste** auf grauem Grund: weiße Kacheln mit großem grauem Linien-Icon, Beschriftung **darunter** klein grau:
   New Table · New Graphical View · New SQL View · New Entity - Relationship Model · New Analytic Model · New Data Flow ·
   New Replication Flow · New Transformation Flow · New Intelligent Lookup · New Task Chain · New Data Access Control
4. Suchfeld mittig „Search in: "All"“, darunter Werkzeugleiste: Filter-Trichter links; rechts `+ ⌄` (Neu-Menü), Deploy `⌄`, Bearbeiten, Löschen,
   weitere Icons, Sortieren, Einstellungen, Umschalter Kacheln/Liste
5. „List Objects In: 🌐 All (260)“, dann **Tabelle**: Checkbox · Business Name · Technical Name · Type (Semantic Usage) · Space · Folder ·
   Status · Changed On · Favorite (☆). Typ als „SQL View“ mit Icon, Semantic Usage in Klammern „(Relational Dataset)“, Status „✔ Deployed“,
   Datum „Feb 19, 2026, 16:41:58“. Ordner (Folder) mit Ordner-Icon in Blau
6. Menü `+`: Folder, Local Table, Graphical View, SQL View, Entity - Relationship Model, Analytic Model, Data Flow, Replication Flow,
   Transformation Flow, Intelligent Lookup, Data Access Control, Currency Conversion Views, Unit Conversion Views, Task Chain.
   Import-Menü: eigene Liste (Bild 19)

### C. Editor (Bild 21, SQL View)
- **Objekt-Werkzeugleiste** unter der Shellbar: Icon-Gruppen mit kleinen Überschriften (Speichern `⌄`, Deploy, Share | Ansicht | Export/Validieren |
  Lineage, weitere); rechts „Versions“ (Rahmen) und **„Details“** (blau gefüllt, schaltet das Properties-Panel)
- links **Repository / Sources** (Reiter), Suche, „All (6)“, Ordner nach Typ (Local Table, Remote Table, Replication Flow, SQL View, Task Chains) mit `•••`
- Mitte: Editor mit Zeilennummern-Spalte, rechts oben Link „Format“ und Validierungs-Schild
- rechts **„Model Properties“**: Kopfband blau `#0070F2`, weiße Schrift, Vollbild-Icon; darunter Objekt-Icon + Titel + Spaltenzahl;
  Felder **Label über Feld**: Business Name · Technical Name · Language (SQL (Standard Query)) · Release State · Semantic Usage ·
  Expose for Consumption (Toggle) · Run in Analytical Mode (Toggle) · Status (✔ Deployed) · Deployed On · Data Validation Status
- Datenvorschau unten (in Bild 21 eingeklappt, Griff `⋯` am unteren Rand)

### D. Monitoring-Listen (Bild 1 Task Logs, 13 Transport, 14 Audit, 16 Tasks)
- H1 fett, darunter **Filterzeile** mit Beschriftung über Dropdown (Date and Time Range · Spaces · Statuses · Space Storage Type), Einklapp-Chevron mittig
- Tabelle auf weißer Fläche mit Titel **„Task Logs (800)“**, rechts Textaktionen („Cancel Task“ deaktiviert, „Refresh“) und Zahnrad
- Status als **farbiger Großbuchstaben-Text** ohne Hintergrund: RUNNING blau, COMPLETED grün, FAILED rot; Aktivität (RUN, RUN_CHAIN) als blauer Link
- Objekttypen in Großbuchstaben: REPLICATION_FLOWS, DATA_FLOWS, TASK_CHAINS

### E. Repository Explorer (Bild 2, 6)
Suchfeld oben mittig „Search in: "All"“; links Filterspalte **Collection** (All, Recent, My Objects, Shared, Favorites) und **Space** (Baum);
Werkzeugleiste wie im Data Builder; Tabelle „Search In: All (13,771)“ mit denselben Spalten wie B.5.

### F. Space Management (Bild 11)
Zweite schmale Spalte links: gelbe Hinweisbox, Liste **Spaces**: All Spaces 86 ›, Recycle Bin 0 ›, Abschnitt Elastic Compute Nodes.
Hauptbereich: **„Spaces (86)“** + Statuszähler mit Icons; Textaktionen Edit · Delete · Lock · Unlock · Monitor, Umschalter Karten/Liste, Suche.
Space-Karte: Checkbox rechts oben, Name, ID, Status (Cold blau / Healthy grün), „Deployed On …“, „Disk for Storage:“ + Balken,
„Memory for Storage:“ + Balken, Chip mit Space-Typ, Fußzeile mit „Edit“-Button.

### G. Home (Bild 3)
„Hello, &lt;Name&gt;“ + Datum, rechts „Auto Refresh Data (OFF)“ und „Customize“. Kartenraster auf `#F5F6F7`: Welcome-Karte (Bild + Text +
„Learn More“), Blog, **Data Integration Tasks** (Recently started – Top 5, Show Only Errors, Status Running/Completed, „Open Data Integration Monitor“),
**Spaces** (Storage / Status – Top 5, Balken, „✓ Working“), **Data Builder** (Recently changed – Top 5, `+⌄`), **Quick Actions**.

### H. Weitere
- **System** (Bild 15): Reiter oben (Audit, Tasks, Data Integration, Security, Monitoring, IP Allowlist, Database Access, Tenant Configuration …),
  Abschnitte mit Titel, Erklärtext, Buttons, Tabelle mit eigener Werkzeugleiste und Leerzustand „No drivers exist.“
- **Monitoring-Kacheln** (Bild 4, 5): Kennzahlenkarten, Ring- und Balkendiagramme, Leerzustand „No data“, Link „View Logs“
- **Semantic Onboarding** (Bild 10): Gruppen „SAP Systems“ und „Content Network“ mit großen Kacheln
- **Settings** (Bild 20): zentraler Dialog, links Kategorien (User Account, Appearance – Horizon, Home Screen, Language & Region, Notifications,
  UI Settings – Show Business Name, Privacy), rechts Inhalt, „Close“ unten rechts

## 4. Abgleich Spiel ↔ Design (Stand 09.10.2026)

Umgebaut am 09.10.2026 (Vergleich per `tests/playtest/look.py`, Screenshots hell und dunkel):

- [x] Shell: Petrol-Banner „Stadtwerke Rheinau · Training Tenant“, weiße Shellbar mit Menü, Zurück, MSC-Logo, App-Symbol + App-Name,
      Breadcrumb (Space-Wechsel im Data Builder), rechts Rang/XP, Glossar, Hilfe, Theme, Avatar, App-Raster
- [x] Seitennavigation in echter Reihenfolge: Monitoring › und Catalog & Marketplace › (aufklappbar, anfangs zu), Gruppen *Apps* und *Utilities*,
      Security/System unten; Auswahl `#EBF8FF` + blauer Balken; Info-Apps ergänzt (Capacities, Task Logs, Expensive Statement Logs,
      Elastic Compute Nodes, Marketplace Data Products, Translation, Data Sharing Cockpit) als Infoseiten
- [x] Farben/Formen: Horizon-Tokens in `src/styles.css` (hell und dunkel), Karten 12 px, Buttons 8 px, Schrift Inter als 72-Ersatz
- [x] Data Builder: Willkommensseite mit Space-Karten (A), Startseite mit Reitern, Kachelleiste (Icon über Text), Suche, Werkzeugleiste mit `+`-Menü,
      „List Objects In: All (n)“, Tabelle mit Checkbox, Type (Semantic Usage), Status mit Icon, Changed On, Favorite (B)
- [x] Editoren (SQL View, Replication Flow, Analytic Model): Objekt-Werkzeugleiste mit Icon-Gruppen, „Versions“/„Details“, blaues „Model Properties“-Panel,
      SQL-View-Editor links „Repository / Sources“ mit Ordnern je Typ (C)
- [x] Space Management mit zweiter Spalte (Spaces, Recycle Bin, Tenant Capacity), „Spaces (n)“ + Zähler, Textaktionen, Karten mit Healthy/Locked und Balken (F)
- [x] Repository Explorer mit Suche oben, Filterspalte Collection/Space, Tabelle wie im Data Builder (E)
- [x] Home: „Hello, Data Architect“, Kartenraster (Welcome mit MSC, Spaces mit Balken und „Working“, Data Builder – Top 5, How to play, Lernpfad, App-Übersicht, Fortschritt) (G)
- [x] Missions-Panel als Horizon-Seitenpanel (blaues Kopfband)
- [x] Einheitliche Kacheln (Wunsch von Curlin): alle Kacheln einer Art gleich groß (Data-Builder-Kacheln 124 × 86 px mit zweizeiliger Beschriftung,
      Space-Karten, Home-Karten, App-Links, Verbindungstypen, Modell-Knoten), Karten einer Reihe gleich hoch; **Rand 1,5 px** in `--tile-border`
      (`#A9B4BE`, dunkel `#5B6875`), beim Überfahren blau. Menüpunkte (Navigation, Menüs, Filterspalten, Reiter) einheitlich hoch, Navigation mit Rahmen bei Hover und Auswahl
- [x] Übersichtlichkeit (Wunsch von Curlin): Grundschrift 500 statt 400, Überschriften/Tabellenköpfe 800, dunklere Sekundärtexte;
      **keine seitlichen Scrollbalken** in Navigation, Seitenpanels, Reitern und Objektlisten (Umbruch statt Scrollen, lange Namen mit „…“ und Tooltip);
      SQL-Editor bricht lange Zeilen um; schmale Bildschirme bis 1366 px (Spalten schmaler, Werkzeugleiste nur Icons). Nur die Datenvorschau scrollt seitlich (Daten)

- [x] Exkurse (Kapitel 12): Transport in der Navigation mit Packages · Export · Import · Monitor, Import- und Monitor-Tabelle mit den Spalten aus
      Bild 13/16 (Status mit Icon und farbigem Text), Business Builder mit Willkommensseite „(Deprecated)“ und Space-Karten (Bild 8, Typ A),
      *Expose for Consumption* als OFF/ON-Pille im Properties-Panel (Bild 21). Packages, Export und die Katalog-Suchseite sind ohne Vorlage gebaut
      (kein Screenshot) im Stil von Typ D

- [x] Data Integration Monitor und Connections mit Willkommensseite + Space-Karten (A, Bild 7), einmal je Besuch; danach Space-Wechsel per Dropdown
      oben rechts. Hinweis: `screenshots/12-connections.png` zeigt in Wahrheit das **Translation Dashboard** („Welcome to the Translation Dashboard“);
      Kopftext der Connections-Willkommensseite daher nicht belegt
- [x] Task Logs wie Bild 1 (D): weißer Kopf mit Filterzeile (Date and Time Range · Spaces · Statuses · Space Storage Type), Einklapp-Chevron,
      Tabelle „Task Logs (n)“ mit Cancel Task (deaktiviert) · Refresh · Zahnrad, Objekttyp und Aktivität in Großbuchstaben (REPLICATION_FLOWS, RUN_CHAIN),
      Status als farbiger Großbuchstaben-Text, Dauer hh:mm:ss, Datum „Oct 2, 2026, 11:55:56“
- [x] System › Configuration wie Bild 15: Reiterleiste oben (Data Integration · Security · Audit · Monitoring · IP Allowlist · Tasks · Database Access ·
      Tenant Configuration · Workload Management), Abschnitte links Titel, rechts Inhalt auf grauem Grund; „About“ als Pille rechts

- [x] Security mit Unterpunkten in der Navigation (Users · Roles · Authorization Overview, aufgeklappt solange die App offen ist), jede Seite im Stil D:
      weißer Kopf mit Titel, Satz und Filterzeile, Tabelle „Users (n)“ / „Scoped Roles (n)“ / „Authorizations (n)“ mit Textaktionen auf grauem Grund;
      Vorlagenkarten der Rollen als eigene Tabelle-Panels darunter. Authorization Overview zeigt je Benutzer, Space und Vorlage, was erlaubt ist (lesend)
- [x] System mit Unterpunkten Configuration · Administration in der Navigation (Bild 20); Administration mit Reitern
      System Configuration · Data Source Configuration · Security · App Integration · Notifications, nur erklärend. Klick auf „System“ öffnet Configuration
- [x] Security zusätzlich mit **Activities** (in Bild 20 als Unterpunkt sichtbar): Protokoll der eigenen Änderungen (Spaces, Rollen, Zuweisungen,
      Verbindungen, Zertifikate, Save/Deploy), nach Mission gruppiert, da das Spiel keine Uhr hat
- [x] **Import-Menü** wie Bild 19: Symbol neben `+` in der Werkzeugleiste der Objektliste mit Import CSV File · Import Objects from CSN/JSON File ·
      Import Entities · Import Remote Tables · Validate Remote Tables · Import Permissions; nur Remote Tables interaktiv, Rest erklärt. Keine Import-Kacheln mehr
- [x] **Settings-Dialog** wie Bild 20: Avatar öffnet Benutzermenü (Settings · About · Sign Out); Settings mit linker Liste (User Account, Appearance,
      Home Screen, Language & Region, Notifications, UI Settings, Privacy) und rechter Seite, „Close“ unten rechts. **Appearance** schaltet Horizon / Horizon Dark /
      System (ersetzt den Theme-Knopf der Shellbar), **UI Settings** wählt Business oder Technical Name in den Objektlisten. About aus System hierher verschoben

Umgebaut am 12.10.2026 nach Bild 22–46:

- [x] **Connections** (Bild 22, 46): Willkommenssatz wie im Original; Liste mit Reitern *Connections* · *SAP Open Connectors* (Space-Wahl rechts daneben),
      Aktionen `+` · Edit · Delete · Validate · Pause · Restart, Spalten Business Name · Type · Created By · Created On · Real-Time Replication Status;
      Validierung und Features als Leiste unter der Tabelle (Spielhilfe); Abschnitt SAP Open Connectors (deaktiviert)
- [x] **Transport** (Bild 27, 28, 31): Packages mit „Space: All Spaces“-Filter und Spalte *Result*; Paket-Editor mit Reitern General · Required Packages · Objects
      (springen zu den Abschnitten), Feldern Business Purpose, Category, Target Location, Version, Current Exported Version; Objekt-Spalten mit Status/Result.
      Statuswert jetzt „Changes To Export“
- [x] **Settings** (Bild 25, 29, 43–45): *Authorized Consent Settings*, Home-Screen-Schalter, Language & Region mit allen Feldern, UI Settings „Display Name“;
      Avatar-Menü zeigt die E-Mail. Dunkles Theme bleibt als Spielzusatz (Original: High Contrast Black/White)
- [x] **Data Flow** (Bild 33): Infobanner zur Empfehlung Replication + Transformation Flow
- [x] **Transformation Flow** (Bild 40): Load Type als Dropdown, Runtime SAP HANA, Knoten „Target“
- [x] **Tabelle** (Bild 30): Feld *Storage* (Disk)

Noch offen:
- [ ] Shellbar rechts: im Original Glocke, Feedback, Support, Hilfe; im Spiel Rang/XP, Glossar, „How to play“ (spielspezifisch, bleibt)
- [ ] Tabellen- und DAC-Editor sind im Original **ganze Seiten mit Reitern** (General · Columns · … bzw. General · Criteria, Bild 30/38), im Spiel Mitte + Seitenpanel
- [ ] Analytic Model: Umschalter *Model · Preview* und „Analytic Model Properties“ (Bild 37); Replication Flow: Kopf „Select Source/Target Connection“ und
      Panel-Abschnitte Settings/Run Settings (Bild 41); Data Sharing Cockpit als Kachel-Übersicht mit Unterpunkten in der Navigation (Bild 42)
- [ ] Security › Users/Roles/Authorization Overview: kein Screenshot möglich (Curlins Rolle sieht nur Activities); Aufbau nach SAP-Hilfe

## 5. Arbeitsweise

1. Vor dem Bauen: passenden Seitentyp oben finden, Screenshot öffnen, Positionsverzeichnis in `BILDBESCHREIBUNGEN.md` für Beschriftungen nutzen.
2. Beschriftungen wörtlich aus den Screenshots übernehmen (englisch). Was im Spiel nicht funktioniert, bleibt sichtbar, aber deaktiviert
   oder öffnet eine Info („not in this game“) – wie bisher bei nicht gebauten Kacheln.
3. Farben nur über die CSS-Variablen in `src/styles.css`, keine festen Farbwerte in Views.
4. Nach dem Bauen: `cd tests/playtest && python3 look.py <ordner> [dark] [1366x768]` macht Screenshots aller Hauptseiten; mit dem Original vergleichen, Abweichungen hier unter 4. festhalten.
5. Neue Screenshots von Curlin: nach `screenshots/` mit nächster Nummer, Beschreibung ergänzen, diese Datei aktualisieren.
