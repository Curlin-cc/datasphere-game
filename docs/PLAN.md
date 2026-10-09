# Projektplan – Datasphere Game

Stand: 8. Oktober 2026. Ausführliche Fassung mit Architekturbild:
[Claude Doc](https://claude.ai/code/artifact/d991f1c0-d825-44b7-8b44-090790888eaa)

## 1. Ziel und Grenzen

Browserbasierte Simulation von SAP Datasphere zum Lernen von Architektur, Layern, Rollen und Best Practices.
Kein 1:1-Nachbau der Oberfläche. Jede Mission hat eine Karte „In the real tenant“, die zeigt,
wo man dieselbe Aufgabe im echten System (Free Tier über BTP oder 30-Tage Basic Trial) findet.

Grenzen:
- DuckDB ist nicht HANA. Standard-SQL im Spiel, HANA-Besonderheiten als Info-Karten.
- Datasphere ändert sich schnell (Teil von SAP Business Data Cloud). Inhalte bekommen ein Prüfdatum.
- Neue Modelle laufen über Fact-Views + Analytic Model. Analytical Dataset und Business Builder
  sind abgelöst und kommen nur als Exkurs vor.

## 2. Business Case

**Stadtwerke Rheinau**, Energieversorger (Strom, Gas). Der Vorstand will einheitliches Reporting
zu Umsatz, Verbrauch und Forderungen je Netzgebiet und Tarif.

Quellen (synthetisch, mit eingebauten Fehlern):
- Abrechnungssystem (S/4HANA-artig): Verträge, Rechnungen, Tarife
- Messwerte: Zählerstände, gemischt kWh und MWh
- CRM-CSV-Export: Kunden mit Dubletten und Tippfehlern
- Altsystem mit abweichenden Schlüsseln

Stakeholder (schicken Tickets):

| Person | Rolle | Will |
| --- | --- | --- |
| CFO | Auftraggeberin | Umsatz und Forderungen je Netzgebiet |
| Head of IT | Tenant-Owner | sauberes Space- und Rollenkonzept |
| Regional Managers North/South | Endnutzer | nur eigene Netzgebiete sehen |
| Calin Mucea, Senior Data Architect | Mentor | Tipps und Code-Reviews |

## 3. Lernpfad

| Nr. | Kapitel | Konzepte | Spieler macht | Best Practice |
| --- | --- | --- | --- | --- |
| 0 | Find your way | Apps der Seitennavigation, Spaces, Repository Explorer, Business/Technical Name, Save vs. Deploy | sich im Tenant zurechtfinden, Objekt umbenennen und deployen | erst orientieren, dann bauen |
| 1 | Space Concept | Spaces, Storage, Priorities, Naming | Spaces je Layer anlegen | Layer trennen, Präfixe |
| 2 | Users & Roles | DW Administrator, Space Administrator, Integrator, Modeler, Viewer, Consumer, Scoped Roles | Rollenmatrix für 8 Personas | Least Privilege, Space Admin delegieren |
| 3 | Data Integration | Connections + Features, Cloud Connector, Zertifikate, Remote vs. Snapshot, Replication Flow (Initial/Delta, Truncate, Projektion), Data Integration Monitor, gesperrter Space | Quellen anbinden, Datenzugriff wählen, Flows bauen, Fehler beheben | `SRC_SYS_ID` beim Laden setzen, Truncate nur wenn eine Quelle die Tabelle besitzt |
| 4 | Inbound Layer | Local Tables, Datenqualität, SQL-Grundlagen | per SQL profilen (Scratch-SQL-View, Data Preview) | keine Logik im Inbound |
| 5 | Harmonization | SQL Views, Joins, Bereinigung, Sharing | Dubletten, Einheiten, Altschlüssel | Logik einmal zentral, wiederverwendbar |
| 6 | Semantics | Fact, Dimension, Text, Hierarchy, Associations | Objekte typisieren und verknüpfen | Fact + Associations statt Riesen-View |
| 7 | Analytic Model | Measures, Calculated/Restricted Measures, Variables | Modell für CFO | schlankes Modell je Use Case |
| 8 | Data Access Controls | DAC mit Kriterien, Berechtigungstabelle | Regionalleiter sehen nur ihr Gebiet | datengetrieben statt hart kodiert |
| 9 | Persistence & Performance | View-Persistenz, remote vs. repliziert | entscheiden, was persistiert wird | nur wenn es sich lohnt |
| 10 | Operations | Transformation Flow, Task Chains, Monitoring | nächtliche Ladekette, Fehler beheben | Abhängigkeiten in Task Chains |
| 11 | Boss Level | alles | Change Request end-to-end ohne Tipps | Architektur im Review verteidigen |

Exkurse: Business Builder / Analytical Dataset (abgelöst), BW Bridge, Catalog & Data Marketplace,
Data Products in Business Data Cloud, Transport zwischen Tenants.

Zielarchitektur: Quellen → `RHN_IN` (Inbound, DW Integrator) → `RHN_HARM` (Harmonization, DW Modeler)
→ `RHN_REP` (Reporting mit Analytic Model + DAC) → CFO (alles) / Regional Managers (eigenes Gebiet).

## 4. Spielmechaniken

Kernkreislauf: Ticket lesen → selbst bauen → prüfen lassen → Feedback verarbeiten.

- **Tickets statt Anleitungen:** fachliche Anforderung, technische Umsetzung selbst ableiten
- **Echtes SQL** gegen echte Daten im Browser
- **Dreifache Prüfung:**
  1. Ergebnisprüfung: Resultset gegen Musterlösung, unabhängig vom Schreibstil
  2. Strukturprüfung: Modellzustand (Space, Semantic Usage, Rollen, DAC)
  3. Best-Practice-Review des Senior Architects (z. B. Logik im Inbound, fehlende Präfixe)
- **Konkretes Feedback** („join returns 214 rows instead of 120“)
- **Gestufte Tipps:** 1 Richtung, 2 Konzept + SAP-Doku-Link, 3 Lückengerüst. Kosten XP. Nie die fertige Lösung.
- **Konsequenzen:** frühere Entscheidungen wirken später nach
- **Karriere:** Junior → Consultant → Senior → Lead Data Architect
- **Badges** für Best Practices
- **Review-Popups** zu bereits gelernten Konzepten
- **Glossar**, wird beim ersten Kontakt freigeschaltet
- **„In the real tenant“-Karte** nach jeder Mission

## 5. Aussehen

Fiori/Horizon-inspiriert, eigenständig. Hell- und Dunkelmodus. Nur Desktop.

- Links: Navigation (Home, Space Management, Data Builder, Security, Data Integration Monitor, Glossary)
- Mitte: Arbeitsbereich (SQL-Editor + Ergebnis, Formulare, Objektlisten)
- Rechts: Missions-Panel (Ticket, Hints, Check, Feedback)
- Oben: Rang, Kapitel-Fortschritt, aktiver Space

## 6. Technik

Statische Web-App ohne Server, getestet als privates claude.ai-Artifact. Vite + TypeScript, DuckDB-WASM, CodeMirror 6.
Missionen als TypeScript-Daten (`src/content/missions/`, Typ in `src/missions/types.ts`), Grundidee:

```json
{
  "id": "c05-m02",
  "chapter": 5,
  "ticket": "CFO: consumption per grid area, everything in kWh",
  "startState": "c05-m01",
  "checks": [
    { "type": "result", "expected": "SELECT ... (reference solution)" },
    { "type": "structure", "object": "RHN_HA_V_CONSUMPTION", "space": "RHN_HARM" },
    { "type": "review", "rule": "no_logic_in_inbound" }
  ],
  "hints": ["direction", "concept + link", "skeleton"],
  "realTenant": "Data Builder > New SQL View ..."
}
```

## 7. Projektgedächtnis

Repo = einzige Quelle. Session-Ablauf:
1. AI liest `AI_CONTEXT.md` + `docs/STATUS.md`
2. Arbeit an klar benannter Mission oder Baustein
3. Am Ende: `STATUS.md`, ggf. `DECISIONS.md`, „Nächster Schritt“ in `AI_CONTEXT.md` aktualisieren
4. Commit + Push direkt aus dem Chat

Knowledge-Graph-Tools (claude-mem, agentmemory u. a.) bewusst nicht genutzt: laufen nur lokal mit
Claude Code und lohnen sich erst bei sehr vielen Sessions.

Fachliche Gegenprüfung beim Schreiben der Missionen: secondsky/sap-skills (GPL-3.0, nur als Quelle, nichts kopieren).

## 8. Roadmap

1. **Fundament:** Repo, Gedächtnis-Dateien, App-Gerüst, DuckDB, Datengenerator, Prüf-Engine
2. **Prototyp:** Kapitel 0–2 spielbar, Tipps und Feedback testen
3. **Datenstrecke:** Kapitel 3–5 mit Konsequenzen
4. **Reporting:** Kapitel 6–8
5. **Betrieb und Abschluss:** Kapitel 9–11, Exkurse, Review-Popups, Feinschliff
