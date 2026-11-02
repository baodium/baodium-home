/**
 * The Chapter 1 program the lab executes.
 * The four lines are the manuscript handler. The flag is checked before
 * recommendation_service.get. That call takes one connection from the
 * 40-connection pool inside Recommendation. The pool is not a second listing.
 */

export const CHAPTER1_SOURCE = `def get_product_page(user_id, product_id):
    product = catalog_service.fetch(product_id)
    recs = recommendation_service.get(user_id, product_id)
    return build_response(product, recs)
`;

/** Each Recommendation instance allows this many connections. */
export const CHAPTER1_POOL_SIZE = 40;

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

export function parseChapter1Program(source: string): Chapter1Program {
  const rows = source.replace(/\r\n/g, "\n").split("\n");
  const catalog = findLine(rows, /catalog_service\.fetch/);
  const call = findLine(rows, /recommendation_service\.get/);
  const respond = findLine(rows, /return build_response/);
  const pageDef = findLine(rows, /def get_product_page/);
  const callLine = call > 0 ? call : 3;

  return {
    source,
    callsCatalog: catalog > 0,
    callsRecommendation: call > 0,
    acquiresPool: call > 0,
    poolSize: CHAPTER1_POOL_SIZE,
    occupancyMs: 70,
    lines: {
      pageDef: pageDef > 0 ? pageDef : 1,
      catalog: catalog > 0 ? catalog : 2,
      call: callLine,
      respond: respond > 0 ? respond : 4,
      recDef: callLine,
      acquire: callLine,
      query: callLine,
      release: callLine,
      recReturn: callLine,
    },
  };
}

export const DEFAULT_CHAPTER1_PROGRAM = parseChapter1Program(CHAPTER1_SOURCE);
