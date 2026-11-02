/**
 * The Chapter 1 program the lab executes.
 * get_product_page is the manuscript listing. recommendation_service_get
 * is the body of that call: a pool of 40, then the query, then release.
 * The feature flag is checked before the call. It is not a line in the listing.
 */

export const CHAPTER1_SOURCE = `def get_product_page(user_id, product_id):
    product = catalog_service.fetch(product_id)
    recs = recommendation_service.get(user_id, product_id)
    return build_response(product, recs)

# Inside recommendation_service.get. Catalog does not take a connection.
def recommendation_service_get(user_id, product_id):
    conn = pool.acquire()  # 40 connections
    rows = query(conn)  # occupancy 70 ms
    pool.release(conn)
    return rows
`;

export type Chapter1Lines = {
  pageDef: number;
  catalog: number;
  call: number;
  respond: number;
  recDef: number;
  acquire: number;
  query: number;
  release: number;
  recReturn: number;
};

export type Chapter1Program = {
  source: string;
  callsCatalog: boolean;
  callsRecommendation: boolean;
  acquiresPool: boolean;
  poolSize: number;
  occupancyMs: number;
  lines: Chapter1Lines;
};

function live(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && !trimmed.startsWith("#");
}

function findLine(lines: string[], pattern: RegExp): number {
  const index = lines.findIndex((line) => live(line) && pattern.test(line));
  return index >= 0 ? index + 1 : -1;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function parseChapter1Program(source: string): Chapter1Program {
  const rows = source.replace(/\r\n/g, "\n").split("\n");
  const catalog = findLine(rows, /catalog_service\.fetch/);
  const call = findLine(rows, /recommendation_service\.get/);
  const acquire = findLine(rows, /pool\.acquire\s*\(/);
  const query = findLine(rows, /query\s*\(/);
  const release = findLine(rows, /pool\.release\s*\(/);
  const respond = findLine(rows, /return build_response/);
  const pageDef = findLine(rows, /def get_product_page/);
  const recDef = findLine(rows, /def recommendation_service_get/);
  const recReturn = findLine(rows, /return rows/);

  const acquireRow = acquire > 0 ? rows[acquire - 1]! : "";
  const queryRow = query > 0 ? rows[query - 1]! : "";
  const poolMatch = acquireRow.match(/(\d+)\s*connections/);
  const occupancyMatch = queryRow.match(/occupancy\s+(\d+)\s*ms/i);

  return {
    source,
    callsCatalog: catalog > 0,
    callsRecommendation: call > 0,
    acquiresPool: acquire > 0 && call > 0,
    poolSize: clampInt(poolMatch ? Number(poolMatch[1]) : 40, 1, 80, 40),
    occupancyMs: clampInt(occupancyMatch ? Number(occupancyMatch[1]) : 70, 5, 500, 70),
    lines: {
      pageDef: pageDef > 0 ? pageDef : 1,
      catalog: catalog > 0 ? catalog : 2,
      call: call > 0 ? call : 3,
      respond: respond > 0 ? respond : 4,
      recDef: recDef > 0 ? recDef : 7,
      acquire: acquire > 0 ? acquire : call > 0 ? call : 8,
      query: query > 0 ? query : 9,
      release: release > 0 ? release : 10,
      recReturn: recReturn > 0 ? recReturn : 11,
    },
  };
}

export const DEFAULT_CHAPTER1_PROGRAM = parseChapter1Program(CHAPTER1_SOURCE);
