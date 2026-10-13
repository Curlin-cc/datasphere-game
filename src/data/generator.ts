/**
 * Seeded data generator for Stadtwerke Rheinau.
 *
 * Pure function, no browser or DuckDB dependency, so it runs in the app and in Node scripts.
 * Same seed → byte-identical data. Change GENERATOR_VERSION whenever the output changes,
 * so saved games can detect stale data later.
 *
 * Built-in defects (the player finds and fixes them in chapters 4 and 5):
 *  - CRM export: duplicate customers (new ID, typo in name, email in other case), stray whitespace
 *  - Meter readings: mixed units kWh / MWh, exact duplicate rows
 *  - Legacy billing system: contracts with A- keys, OLD- customer keys, German grid area and tariff codes
 *  - Grid area spelling: legacy rows use 'Nord', 'Süd', 'Ost', 'West'
 */

export const GENERATOR_VERSION = 1;
export const DEFAULT_SEED = 20261008;

/** Business "today" of the training tenant. Overdue invoices are measured against it. */
export const REFERENCE_DATE = '2026-07-15';

export type ColType = 'VARCHAR' | 'DATE' | 'INTEGER' | 'DECIMAL(12,3)' | 'DECIMAL(12,2)';
export type Cell = string | number | null;

export interface TableData {
  space: string;
  name: string;
  /** Short description shown in the object browser later. */
  description: string;
  columns: { name: string; type: ColType }[];
  rows: Cell[][];
}

/** Ground truth about the injected defects, used by checks and feedback texts. */
export interface DataFacts {
  customers: number;
  crmDuplicates: number;
  contractsS4: number;
  contractsLegacy: number;
  readingDuplicates: number;
  readingsInMwh: number;
  invoices: number;
}

export interface Dataset {
  seed: number;
  tables: TableData[];
  facts: DataFacts;
}

// ---------------------------------------------------------------- random helpers

/** mulberry32: small, fast, deterministic. */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    /** Weighted pick: [[value, weight], ...] */
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of items) {
        if ((r -= w) < 0) return v;
      }
      return items[items.length - 1][0];
    },
  };
}

const pad = (n: number, len: number) => String(n).padStart(len, '0');
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- master data

interface GridArea {
  code: string;
  legacyCode: string;
  name: string;
  region: 'NORTH' | 'SOUTH';
  cities: readonly (readonly [string, string])[]; // [zip, city]
  weight: number;
}

/** Regional manager North sees NORTH + EAST, South sees SOUTH + WEST (chapter 8). */
const GRID_AREAS: readonly GridArea[] = [
  { code: 'NORTH', legacyCode: 'Nord', name: 'Rheinau Nord', region: 'NORTH', weight: 3,
    cities: [['76401', 'Rheinau'], ['76405', 'Altenheim'], ['76408', 'Kehlbach']] },
  { code: 'EAST', legacyCode: 'Ost', name: 'Schwarzwaldrand', region: 'NORTH', weight: 2,
    cities: [['76420', 'Bergtal'], ['76423', 'Waldhofen']] },
  { code: 'SOUTH', legacyCode: 'Süd', name: 'Rheinau Süd', region: 'SOUTH', weight: 3,
    cities: [['76430', 'Rheinau'], ['76434', 'Auenbach'], ['76437', 'Lindenau']] },
  { code: 'WEST', legacyCode: 'West', name: 'Rheinufer', region: 'SOUTH', weight: 1,
    cities: [['76440', 'Fährhausen'], ['76442', 'Wörth am Rhein']] },
];

interface Tariff {
  code: string;
  legacyCode: string;
  commodity: 'POWER' | 'GAS';
  name: string;
  pricePerKwh: number;
  baseFeeMonth: number;
  /** Typical yearly consumption in kWh for a household on this tariff. */
  yearlyKwh: readonly [number, number];
  weight: number;
}

const TARIFFS: readonly Tariff[] = [
  { code: 'POWER_BASIC', legacyCode: 'STROM_BASIS', commodity: 'POWER', name: 'Rheinau Strom Basis',
    pricePerKwh: 0.3290, baseFeeMonth: 12.5, yearlyKwh: [1500, 4500], weight: 5 },
  { code: 'POWER_GREEN', legacyCode: 'STROM_OEKO', commodity: 'POWER', name: 'Rheinau Strom Öko',
    pricePerKwh: 0.3450, baseFeeMonth: 12.5, yearlyKwh: [1500, 4000], weight: 3 },
  { code: 'POWER_HEAT', legacyCode: 'STROM_WAERME', commodity: 'POWER', name: 'Rheinau Wärmestrom',
    pricePerKwh: 0.2790, baseFeeMonth: 9.9, yearlyKwh: [4000, 9000], weight: 1 },
  { code: 'GAS_COMFORT', legacyCode: 'GAS_KOMFORT', commodity: 'GAS', name: 'Rheinau Gas Komfort',
    pricePerKwh: 0.1090, baseFeeMonth: 14.9, yearlyKwh: [8000, 22000], weight: 3 },
  { code: 'GAS_FLEX', legacyCode: 'GAS_FLEX', commodity: 'GAS', name: 'Rheinau Gas Flex',
    pricePerKwh: 0.1190, baseFeeMonth: 11.9, yearlyKwh: [6000, 18000], weight: 1 },
];

const FIRST_NAMES = [
  'Anna', 'Ben', 'Clara', 'David', 'Elena', 'Felix', 'Greta', 'Hannah', 'Jonas', 'Julia', 'Karl', 'Lea',
  'Lukas', 'Marie', 'Max', 'Mia', 'Noah', 'Paul', 'Sophie', 'Tim', 'Ursula', 'Vera', 'Werner', 'Yasemin',
  'Emre', 'Katarzyna', 'Luca', 'Nina', 'Oliver', 'Petra', 'Ralf', 'Sabine', 'Thomas', 'Ingrid', 'Dieter',
] as const;

const LAST_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Koch', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Braun', 'Zimmermann', 'Krüger', 'Hartmann',
  'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Maier', 'Kaya', 'Nowak', 'Rossi', 'Yilmaz',
] as const;

const STREETS = [
  'Hauptstraße', 'Bahnhofstraße', 'Rheinstraße', 'Schulstraße', 'Gartenweg', 'Lindenallee', 'Mühlweg',
  'Am Deich', 'Kirchgasse', 'Waldstraße', 'Auenweg', 'Fährstraße', 'Bergstraße', 'Rosenweg',
] as const;

/** ASCII-fold for e-mail addresses. */
const fold = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** Swaps two neighbouring letters: the classic typo of a manual CRM entry. */
function typo(r: ReturnType<typeof rng>, s: string): string {
  if (s.length < 4) return s + s.slice(-1);
  const i = r.int(1, s.length - 3);
  return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
}

// ---------------------------------------------------------------- generator

/** Half-year billing periods from 2024 to the reference date. */
const PERIODS: readonly [string, string][] = [
  ['2024-01-01', '2024-06-30'],
  ['2024-07-01', '2024-12-31'],
  ['2025-01-01', '2025-06-30'],
  ['2025-07-01', '2025-12-31'],
  ['2026-01-01', '2026-06-30'],
];

export function generateDataset(seed = DEFAULT_SEED, size = { customers: 900 }): Dataset {
  const r = rng(seed);

  // ---- customers (CRM) -------------------------------------------------
  interface Customer {
    id: string;
    first: string;
    last: string;
    street: string;
    zip: string;
    city: string;
    email: string;
    created: string;
    area: GridArea;
  }
  const customers: Customer[] = [];
  for (let i = 0; i < size.customers; i++) {
    const area = r.weighted(GRID_AREAS.map((a) => [a, a.weight] as const));
    const [zip, city] = r.pick(area.cities);
    const first = r.pick(FIRST_NAMES);
    const last = r.pick(LAST_NAMES);
    customers.push({
      id: `K-${pad(100501 + i, 6)}`,
      first,
      last,
      street: `${r.pick(STREETS)} ${r.int(1, 120)}`,
      zip,
      city,
      email: `${fold(first)}.${fold(last)}${r.int(1, 99)}@${r.pick(['mail.de', 'web.de', 'posteo.de', 'gmx.de'])}`,
      created: addDays('2015-01-01', r.int(0, 3600)),
      area,
    });
  }

  const crmRows: Cell[][] = [];
  let crmDuplicates = 0;
  let nextDupId = 100501 + size.customers + 37;
  for (const c of customers) {
    // Stray whitespace and inconsistent case appear in about 3 % of manual entries.
    const name = r.chance(0.03) ? ` ${c.last}, ${c.first}` : `${c.last}, ${c.first}`;
    crmRows.push([c.id, name, c.street, c.zip, c.city, c.email, c.created]);
    if (r.chance(0.045)) {
      // Same person entered again by the call centre: new ID, typo in name, e-mail in upper case.
      crmDuplicates++;
      crmRows.push([
        `K-${pad(nextDupId++, 6)}`,
        `${r.chance(0.5) ? typo(r, c.last) : c.last}, ${c.first}`,
        c.street,
        c.zip,
        c.city,
        r.chance(0.6) ? c.email.toUpperCase() : c.email,
        addDays(c.created, r.int(200, 1500)),
      ]);
    }
  }
  // Export order of a CRM is never sorted by key.
  shuffle(r, crmRows);

  // ---- contracts (S/4 billing + legacy system) ---------------------------
  interface Contract {
    id: string;
    customerId: string;
    area: GridArea;
    tariff: Tariff;
    start: string;
    end: string | null;
    legacy: boolean;
    yearlyKwh: number;
    meterId: string;
    unitMwh: boolean;
  }
  const contracts: Contract[] = [];
  const legacyMapRows: Cell[][] = [];
  let contractNo = 10001;
  let legacyNo = 701;
  let meterNo = 900001;
  let legacyContractNo = 30501;

  for (const c of customers) {
    // Most households have power, about 40 % also gas.
    const commodities: ('POWER' | 'GAS')[] = ['POWER'];
    if (r.chance(0.4)) commodities.push('GAS');
    if (r.chance(0.08)) commodities.splice(0, 1); // gas only

    // About 9 % of customers still sit in the legacy billing system.
    const legacy = r.chance(0.09);
    const legacyCustomerId = `OLD-${pad(legacyNo++, 4)}`;
    if (legacy) legacyMapRows.push([legacyCustomerId, c.id, addDays('2024-03-01', r.int(0, 60))]);

    for (const commodity of commodities) {
      const tariff = r.weighted(TARIFFS.filter((t) => t.commodity === commodity).map((t) => [t, t.weight] as const));
      const start = legacy ? addDays('2012-01-01', r.int(0, 2900)) : addDays('2019-01-01', r.int(0, 2100));
      const ended = r.chance(0.07);
      contracts.push({
        id: legacy ? `A-${legacyContractNo++}` : `C-${contractNo++}`,
        customerId: legacy ? legacyCustomerId : c.id,
        area: c.area,
        tariff,
        start,
        end: ended ? addDays('2024-06-30', r.int(0, 640)) : null,
        legacy,
        yearlyKwh: r.int(tariff.yearlyKwh[0], tariff.yearlyKwh[1]),
        meterId: `M-${meterNo++}`,
        // Large gas meters of the old metering setup still report in MWh.
        unitMwh: commodity === 'GAS' && r.chance(0.18),
      });
    }
  }

  const contractRows: Cell[][] = contracts.map((k) => [
    k.id,
    k.customerId,
    k.legacy ? k.area.legacyCode : k.area.code,
    k.legacy ? k.tariff.legacyCode : k.tariff.code,
    k.start,
    k.end,
    k.legacy ? 'LEGACY' : 'S4U',
  ]);

  // ---- meter readings and invoices ---------------------------------------
  const readingRows: Cell[][] = [];
  const invoiceRows: Cell[][] = [];
  let readingDuplicates = 0;
  let readingsInMwh = 0;
  let invoiceNo = 4000001;

  for (const k of contracts) {
    for (const [from, to] of PERIODS) {
      if (k.start > to) continue;
      if (k.end && k.end < from) continue;
      const pFrom = k.start > from ? k.start : from;
      const pTo = k.end && k.end < to ? k.end : to;
      const days = (Date.parse(pTo) - Date.parse(pFrom)) / 86400000 + 1;

      // Gas is seasonal: winter half-years consume far more.
      const winter = from.slice(5, 7) === '01' ? 1 : 0;
      const season = k.tariff.commodity === 'GAS' ? (winter ? 1.35 : 0.65) : winter ? 1.08 : 0.92;
      const kwh = round((k.yearlyKwh / 365) * days * season * (0.85 + r.next() * 0.3), 3);

      const value = k.unitMwh ? round(kwh / 1000, 3) : kwh;
      const row: Cell[] = [k.meterId, k.id, pTo, value, k.unitMwh ? 'MWh' : 'kWh', k.legacy ? 'LEGACY' : 'MDM'];
      readingRows.push(row);
      if (k.unitMwh) readingsInMwh++;
      // An interface hiccup sends some readings twice.
      if (r.chance(0.015)) {
        readingRows.push([...row]);
        readingDuplicates++;
        if (k.unitMwh) readingsInMwh++;
      }

      // Invoice for the period, priced from the meter value in kWh.
      const months = Math.max(1, Math.round(days / 30.4));
      const net = round(kwh * k.tariff.pricePerKwh + months * k.tariff.baseFeeMonth, 2);
      const tax = round(net * 0.19, 2);
      const invoiceDate = addDays(pTo, r.int(5, 20));
      const due = addDays(invoiceDate, 14);
      let status: string;
      let paid: string | null = null;
      if (due > REFERENCE_DATE) {
        status = 'OPEN';
      } else if (r.chance(from >= '2026-01-01' ? 0.12 : 0.025)) {
        status = 'OVERDUE';
      } else {
        status = 'PAID';
        paid = addDays(invoiceDate, r.int(2, 30));
        if (paid > REFERENCE_DATE) paid = REFERENCE_DATE;
      }
      invoiceRows.push([
        k.legacy ? `R-${invoiceNo++}` : `INV-${invoiceNo++}`,
        k.id,
        invoiceDate,
        pFrom,
        pTo,
        net,
        tax,
        'EUR',
        status,
        due,
        paid,
        k.legacy ? 'LEGACY' : 'S4U',
      ]);
    }
  }

  // ---- assemble ----------------------------------------------------------
  const tables: TableData[] = [
    {
      space: 'RHN_ENTRY',
      name: 'BILLING_CONTRACTS',
      description: 'Supply contracts from S/4HANA billing (S4U) and the legacy billing system (LEGACY)',
      columns: [
        { name: 'CONTRACT_ID', type: 'VARCHAR' },
        { name: 'CUSTOMER_ID', type: 'VARCHAR' },
        { name: 'GRID_AREA', type: 'VARCHAR' },
        { name: 'TARIFF', type: 'VARCHAR' },
        { name: 'START_DATE', type: 'DATE' },
        { name: 'END_DATE', type: 'DATE' },
        { name: 'SRC_SYS_ID', type: 'VARCHAR' },
      ],
      rows: contractRows,
    },
    {
      space: 'RHN_ENTRY',
      name: 'BILLING_INVOICES',
      description: 'Half-yearly invoices per contract, net and tax in EUR',
      columns: [
        { name: 'INVOICE_ID', type: 'VARCHAR' },
        { name: 'CONTRACT_ID', type: 'VARCHAR' },
        { name: 'INVOICE_DATE', type: 'DATE' },
        { name: 'PERIOD_FROM', type: 'DATE' },
        { name: 'PERIOD_TO', type: 'DATE' },
        { name: 'NET_AMOUNT', type: 'DECIMAL(12,2)' },
        { name: 'TAX_AMOUNT', type: 'DECIMAL(12,2)' },
        { name: 'CURRENCY', type: 'VARCHAR' },
        { name: 'STATUS', type: 'VARCHAR' },
        { name: 'DUE_DATE', type: 'DATE' },
        { name: 'PAID_DATE', type: 'DATE' },
        { name: 'SRC_SYS_ID', type: 'VARCHAR' },
      ],
      rows: invoiceRows,
    },
    {
      space: 'RHN_ENTRY',
      name: 'TARIFFS',
      description: 'Tariff master data with prices (current codes only)',
      columns: [
        { name: 'TARIFF', type: 'VARCHAR' },
        { name: 'COMMODITY', type: 'VARCHAR' },
        { name: 'TARIFF_NAME', type: 'VARCHAR' },
        { name: 'PRICE_PER_KWH', type: 'DECIMAL(12,3)' },
        { name: 'BASE_FEE_MONTH', type: 'DECIMAL(12,2)' },
        { name: 'SRC_SYS_ID', type: 'VARCHAR' },
      ],
      rows: TARIFFS.map((t) => [t.code, t.commodity, t.name, t.pricePerKwh, t.baseFeeMonth, 'S4U']),
    },
    {
      space: 'RHN_ENTRY',
      name: 'GRID_AREAS',
      description: 'Grid areas and the sales region they belong to',
      columns: [
        { name: 'GRID_AREA', type: 'VARCHAR' },
        { name: 'GRID_AREA_NAME', type: 'VARCHAR' },
        { name: 'REGION', type: 'VARCHAR' },
        { name: 'SRC_SYS_ID', type: 'VARCHAR' },
      ],
      rows: GRID_AREAS.map((a) => [a.code, a.name, a.region, 'S4U']),
    },
    {
      space: 'RHN_ENTRY',
      name: 'METER_READINGS',
      description: 'Consumption per meter since the previous reading, from the meter data system',
      columns: [
        { name: 'METER_ID', type: 'VARCHAR' },
        { name: 'CONTRACT_ID', type: 'VARCHAR' },
        { name: 'READING_DATE', type: 'DATE' },
        { name: 'VALUE', type: 'DECIMAL(12,3)' },
        { name: 'UNIT', type: 'VARCHAR' },
        { name: 'SRC_SYS_ID', type: 'VARCHAR' },
      ],
      rows: readingRows,
    },
    {
      space: 'RHN_ENTRY',
      name: 'CRM_CUSTOMERS',
      description: 'Customer export from the CRM as a CSV file',
      columns: [
        { name: 'CUSTOMER_ID', type: 'VARCHAR' },
        { name: 'NAME', type: 'VARCHAR' },
        { name: 'STREET', type: 'VARCHAR' },
        { name: 'ZIP', type: 'VARCHAR' },
        { name: 'CITY', type: 'VARCHAR' },
        { name: 'EMAIL', type: 'VARCHAR' },
        { name: 'CREATED_AT', type: 'DATE' },
      ],
      rows: crmRows,
    },
    {
      space: 'RHN_ENTRY',
      name: 'LEGACY_CUSTOMER_MAP',
      description: 'Key mapping from legacy customer numbers to CRM customer IDs, maintained by IT',
      columns: [
        { name: 'LEGACY_CUSTOMER_ID', type: 'VARCHAR' },
        { name: 'CUSTOMER_ID', type: 'VARCHAR' },
        { name: 'MAPPED_ON', type: 'DATE' },
      ],
      rows: legacyMapRows,
    },
  ];

  return {
    seed,
    tables,
    facts: {
      customers: customers.length,
      crmDuplicates,
      contractsS4: contracts.filter((k) => !k.legacy).length,
      contractsLegacy: contracts.filter((k) => k.legacy).length,
      readingDuplicates,
      readingsInMwh,
      invoices: invoiceRows.length,
    },
  };
}

function shuffle<T>(r: ReturnType<typeof rng>, arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------------------------------------------------------------- SQL output

const sqlLiteral = (v: Cell, type: ColType): string => {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  const s = `'${v.replace(/'/g, "''")}'`;
  return type === 'DATE' ? `DATE ${s}` : s;
};

/** Builds CREATE + INSERT statements, chunked so no single statement gets huge. */
export function datasetToSql(ds: Dataset, chunk = 1000): string[] {
  const out: string[] = [];
  for (const space of new Set(ds.tables.map((t) => t.space))) out.push(`CREATE SCHEMA IF NOT EXISTS ${space};`);
  for (const t of ds.tables) {
    const full = `${t.space}.${t.name}`;
    out.push(`CREATE OR REPLACE TABLE ${full} (\n  ${t.columns.map((c) => `${c.name} ${c.type}`).join(',\n  ')}\n);`);
    for (let i = 0; i < t.rows.length; i += chunk) {
      const values = t.rows
        .slice(i, i + chunk)
        .map((row) => `(${row.map((v, j) => sqlLiteral(v, t.columns[j].type)).join(', ')})`)
        .join(',\n');
      out.push(`INSERT INTO ${full} VALUES\n${values};`);
    }
  }
  return out;
}
