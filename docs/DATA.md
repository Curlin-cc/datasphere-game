# Testdaten – Stadtwerke Rheinau

Erzeugt von `src/data/generator.ts` (Generator v1, Seed `20261008`). Läuft beim Start im Browser,
gleicher Seed = identische Daten für jeden Spieler. Prüfen: `npm run data:report` (Zeilen, Fehlerzahlen, Fingerprint).
Ändert sich der Fingerprint, `GENERATOR_VERSION` erhöhen – Missionen und Musterlösungen hängen an den Daten.

Geschäftliches „Heute“ im Tenant: **2026-07-15** (`REFERENCE_DATE`). Danach richten sich offene/überfällige Rechnungen.

## Tabellen in `RHN_IN`

| Tabelle | Zeilen | Quelle (`SRC_SYS_ID`) | Inhalt |
| --- | --- | --- | --- |
| BILLING_CONTRACTS | 1178 | S4U, LEGACY | Lieferverträge Strom/Gas, Netzgebiet, Tarif, Laufzeit |
| BILLING_INVOICES | 5726 | S4U, LEGACY | Halbjahresrechnungen 2024–2026, Netto, Steuer, Status OPEN/PAID/OVERDUE |
| TARIFFS | 5 | S4U | Tarifstamm mit Preis/kWh und Grundgebühr (nur neue Codes) |
| GRID_AREAS | 4 | S4U | NORTH, EAST → Region NORTH; SOUTH, WEST → Region SOUTH |
| METER_READINGS | 5824 | MDM, LEGACY | Verbrauch je Zähler seit letzter Ablesung, Einheit kWh oder MWh |
| CRM_CUSTOMERS | 946 | – (CSV, keine Spalte!) | Kunden: Name „Nachname, Vorname“, Adresse, E-Mail |
| LEGACY_CUSTOMER_MAP | 71 | – | Altsystem-Kundennr. `OLD-…` → CRM-ID `K-…` |

## Eingebaute Fehler (für Kapitel 4 und 5)

| Fehler | Umfang | Erkennen | Beheben (Harmonization) |
| --- | --- | --- | --- |
| Netzgebiet deutsch im Altsystem | 91 Verträge (`Nord`, `Ost`, `Süd`, `West`) | `GROUP BY GRID_AREA` | Mapping auf NORTH/EAST/SOUTH/WEST |
| Altsystem-Tarifcodes | `STROM_BASIS`, `STROM_OEKO`, `STROM_WAERME`, `GAS_KOMFORT`; `GAS_FLEX` gleich | Join auf TARIFFS verliert Zeilen | Mapping-Tabelle/CASE |
| Altsystem-Kundennummern | 91 Verträge mit `OLD-…` | Join auf CRM_CUSTOMERS findet 91 nicht | über LEGACY_CUSTOMER_MAP → 0 offen |
| CRM-Dubletten | 46 Personen doppelt (neue ID, ggf. Buchstabendreher, E-Mail in Großbuchstaben) | `GROUP BY lower(EMAIL)` | Dubletten zusammenführen, eine ID behalten |
| Leerzeichen im Namen | ca. 3 % mit führendem Leerzeichen | `NAME <> trim(NAME)` | `trim` |
| Gemischte Einheiten | 263 Ablesungen in MWh (Gaszähler) | `GROUP BY UNIT` | MWh × 1000 → kWh |
| Doppelte Ablesungen | 98 exakte Dubletten | `COUNT(*)` vs. `SELECT DISTINCT` | `DISTINCT` / `QUALIFY` |
| CRM ohne SRC_SYS_ID | ganze Tabelle | Spaltenliste | Kapitel 3 (c03-m05): Replication Flow mit Projektion `SRC_SYS_ID = 'CRM'` hängt die Spalte an (`appliedColumns` im Spielstand, bei jedem Start erneut angewendet) |

Absichtlich *kein* Fehler: Rechnungen sind korrekt aus kWh berechnet, damit Umsatz eine verlässliche Prüfsumme ist.

## Quellsysteme (Kapitel 3, `src/integration.ts`)

Die Pilot-Tabellen in `RHN_IN` sind die Ziele der Replikation; die Daten selbst bleiben die des Generators.
Remote Tables sind DuckDB-Views auf diese Tabellen, Läufe zählen nur Datensätze (Filter über `SRC_SYS_ID`).

| Quelle | Host / Bucket (fiktiv) | Typ | Objekte | Delta |
| --- | --- | --- | --- | --- |
| S4U | `billing.rheinau-s4.example` | SAP S/4HANA Cloud | BILLING_CONTRACTS, BILLING_INVOICES (nur S4U-Zeilen), TARIFFS, GRID_AREAS | Verträge, Rechnungen |
| MDM | `mdm-db.rheinau.local` | SAP HANA on-premise, Cloud Connector `RHEINAU_DC`, TLS mit „Rheinau Root CA“ | METER_READINGS (nur MDM-Zeilen) | ja |
| CRM | Bucket `rheinau-crm-export` | Amazon S3 | `customers/CRM_CUSTOMERS.csv` | nein |
