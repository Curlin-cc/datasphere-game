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

## Kennzahlen der Harmonisierung (Kapitel 5, geprüft mit DuckDB am 09.10.2026)

| View in `RHN_HARM` | Zeilen | Wichtige Zahlen |
| --- | --- | --- |
| `RHN_HA_V_CONTRACTS` | 1178 | nach Mapping NORTH 385, EAST 251, SOUTH 411, WEST 131; Region NORTH 636, SOUTH 542; 91 Altkunden-Nummern → 69 CRM-IDs; 0 Verträge ohne CRM-Kunde |
| `RHN_HA_V_CUSTOMERS` | 900 | 946 Datensätze − 46 Dubletten. Dublette = gleiche E-Mail (ohne Groß/Klein) **und** gleiche Adresse; ältester Datensatz (CREATED_AT) bleibt, denn Verträge zeigen immer auf ihn |
| `RHN_HA_V_METER_READINGS` | 5726 | 5824 − 98 Dubletten (= Anzahl Rechnungen); 19.878.601 kWh gesamt, 2025: 7,74 GWh |

Fallen, die die Prüfungen gezielt erkennen:
- **Namensvettern:** Nur nach E-Mail gruppiert → 897 Kunden, weil 3 Paare verschiedener Personen (verschiedene Straßen) dieselbe E-Mail haben; 2 Verträge verlieren ihren Kunden
- **Neuester statt ältester Datensatz:** 61 Verträge finden ihren Kunden nicht
- **E-Mails:** Großbuchstaben kommen nur bei Dubletten vor; `lower(EMAIL)` ändert beim ältesten Datensatz nichts
- 2025 falsch: ohne MWh-Umrechnung 6,96 GWh, mit Dubletten 7,88 GWh, beides falsch 7,10 GWh

## Reporting-Objekte (Kapitel 6)

| Objekt in `RHN_REP` | Usage | Zeilen | Key / Measures |
| --- | --- | --- | --- |
| `RHN_REP_D_GRID_AREA` | Dimension | 4 | Key GRID_AREA |
| `RHN_REP_D_TARIFF` | Dimension | 5 | Key TARIFF |
| `RHN_REP_D_CUSTOMER` | Dimension | 900 | Key CUSTOMER_ID (ohne EMAIL, STREET) |
| `RHN_REP_F_CONSUMPTION` | Fact | 5726 | Measure CONSUMPTION_KWH |
| `RHN_REP_F_INVOICES` | Fact | 5726 | Measures NET_AMOUNT, TAX_AMOUNT |

Netto 2025 (Rechnungsdatum) je Region: NORTH 871.074,11 EUR, SOUTH 746.381,41 EUR. Fallen: nur Netzgebiet NORTH 530.628 EUR;
Rohdaten ohne Legacy-Mapping 785.429 EUR; brutto 1,04 Mio. EUR.

## Analytic Models (Kapitel 7, geprüft mit DuckDB am 09.10.2026)

| Objekt in `RHN_REP` | Fact | Dimensionen | Measures / Variablen |
| --- | --- | --- | --- |
| `RHN_REP_AM_INVOICES` | `RHN_REP_F_INVOICES` | Grid Area, Tariff (kein Customer) | NET_AMOUNT, TAX_AMOUNT, GROSS_AMOUNT (calculated), UNPAID_GROSS (restricted OPEN+OVERDUE), CUSTOMERS (count distinct); V_INVOICE_DATE (Interval, Pflicht) |
| `RHN_REP_AM_CONSUMPTION` | `RHN_REP_F_CONSUMPTION` | Grid Area, Tariff (kein Customer) | CONSUMPTION_KWH; V_READING_DATE (Interval, optional) |

Zahlen: Netto je Region gesamt NORTH 2.189.963,23 / SOUTH 1.861.721,70 EUR; Netto je Tarif: Strom Basis 1.260.887 knapp vor Gas Komfort 1.250.288 EUR.
Brutto je Status: OPEN 1.069.961,59 · OVERDUE 81.724,52 · PAID 3.669.819,03 EUR. Unbezahlt brutto: NORTH 630.901,23 · SOUTH 520.784,88 EUR
(nur OPEN bzw. nur OVERDUE als Fallen). Brutto 2025: NORTH 1.036.578,18 · SOUTH 888.193,85 EUR.
Kunden (count distinct): gesamt 848, Gas 361 + Strom 817 = 1.178 (330 Kunden mit beidem), NORTH 467 · SOUTH 381.
Verbrauch 2025: NORTH Gas 2,63 / Strom 1,48 GWh, SOUTH Gas 2,42 / Strom 1,20 GWh.

## Laufzeiten (Kapitel 9, simuliert mit `src/perf.ts`, geprüft am 09.10.2026)

Produktionsvolumen ≈ 1000 × Trainingsdaten; Dauer je Story-Aufruf (± 8 % je Benutzer):

| Objekt | virtuell | mit persistierter `RHN_HA_V_METER_READINGS` |
| --- | --- | --- |
| `RHN_REP_AM_CONSUMPTION` | ≈ 7 s | ≈ 1,5 s |
| `RHN_REP_AM_INVOICES` | ≈ 1,7–2 s | unverändert |

View Analyzer unter `RHN_REP_F_CONSUMPTION`: eigene Laufzeit `RHN_HA_V_METER_READINGS` ≈ 5,5 s (Dublettenentfernung auf 5.824 Ablesungen),
Fact ≈ 0,7 s (Join), `RHN_HA_V_CONTRACTS` ≈ 0,3 s. Snapshot der Ablesungen: 5.726 Datensätze, ≈ 1,1 GB In-Memory (Produktionsvolumen).
