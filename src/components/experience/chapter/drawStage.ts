import catalog from "../../../../content/experience/ch01/catalog.json";
import { CHAPTER1_MODEL, type ChapterSimEngine, type SimRequest } from "@/lib/experience/ch01/sim";

export const STAGE = { width: 1000, height: 540 };

const C = {
  ink: "#241c18",
  muted: "#6f625a",
  line: "#e6ddd2",
  steel: "#2e6aa8",
  amber: "#c98a0c",
  oxide: "#b03a2e",
  ok: "#2f7d4f",
  violet: "#7a4fb3",
  copper: "#b4532a",
  paper: "#fbf8f3",
};

const PRODUCTS = catalog.map((item) => ({
  name: item.name.replace("800-fill ", "").replace("Summit binoculars 8x32", "Summit binoculars"),
  price: `$${item.price}`,
  tint: item.tint,
}));

type Point = { x: number; y: number };
type Box = Point & { w: number; h: number };

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 13,
  color = C.muted,
  weight = 400,
  align: CanvasTextAlign = "left",
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function tile(index: number) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 248 + col * 184, y: 58 + row * 156, w: 168, h: 146 };
}

function avatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  maya: boolean,
  progress: number,
) {
  ctx.fillStyle = maya ? C.copper : "#8a7b70";
  ctx.beginPath();
  ctx.arc(x, y - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  rounded(ctx, x - 6, y, 12, 12, 5);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.lineWidth = 1;
}

export function drawCustomer(
  ctx: CanvasRenderingContext2D,
  engine: ChapterSimEngine,
  alpha: number,
  reduced: boolean,
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, STAGE.width, 46);
  text(ctx, "BAODIUM", 22, 29, 15, "#fff", 700);
  text(ctx, "Tents    Packs    Kitchen    Navigation", 150, 29, 13, "#cfc4ba");

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const spot = tile(i);
    const product = PRODUCTS[i];
    if (!product) continue;
    ctx.fillStyle = "#fff";
    rounded(ctx, spot.x, spot.y, spot.w, spot.h, 12);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.stroke();
    ctx.fillStyle = product.tint;
    rounded(ctx, spot.x, spot.y, spot.w, 78, 12);
    ctx.fill();
    ctx.fillRect(spot.x, spot.y + 66, spot.w, 12);
    text(ctx, product.name, spot.x + 12, spot.y + 104, 13, C.ink, 650);
    text(ctx, product.price, spot.x + 12, spot.y + 124, 13, C.ink, 650);
  }

  for (const request of engine.sprites) {
    if (request.kind !== "page") continue;
    drawShopper(ctx, engine, request, alpha, reduced);
  }

  const waitingPages = engine.queue.filter((request) => request.kind === "page").length;
  text(
    ctx,
    waitingPages ? `${waitingPages} shoppers' pages are stuck loading` : "Pages load quickly",
    24,
    528,
    13,
    waitingPages ? C.oxide : C.ok,
    650,
  );
  ctx.restore();
}

function drawShopper(
  ctx: CanvasRenderingContext2D,
  engine: ChapterSimEngine,
  request: SimRequest,
  alpha: number,
  reduced: boolean,
) {
  const spot = tile(request.product % 12);
  const age = engine.t - request.arr;
  const slot = (request.id * 37) % 4;
  const sx = spot.x + 28 + slot * 34;
  const sy = spot.y + 48 - ((request.id * 13) % 2) * 8;
  let x = sx;
  let y = sy;
  if (!reduced && age < 0.15) {
    const k = age / 0.15;
    x = 40 + ((request.id * 53) % 140) + (sx - 80) * k;
    y = 80 + ((request.id * 29) % 360) + (sy - 220) * k;
  }
  let fade = 1;
  if (request.state === "done") {
    const since = engine.t - request.end;
    const keep = request.maya ? 6 : 0.6;
    if (since > keep) return;
    fade = request.maya ? 1 : 1 - since / 0.6;
  }
  const waited = request.state === "done" ? request.total : age;
  const color = waited > 1 ? C.oxide : waited > 0.3 ? C.amber : C.ok;
  ctx.globalAlpha = alpha * fade;
  avatar(ctx, x, y, color, request.maya, request.state === "done" ? 1 : Math.min(1, age / 1.2));
  if (request.maya) {
    const label =
      request.state === "done"
        ? `Maya · ${Math.round(request.total * 1000)} ms`
        : `Maya · ${Math.round(age * 1000)} ms…`;
    text(ctx, label, x, y - 24, 12, C.copper, 700, "center");
  }
  ctx.globalAlpha = alpha;
}

const X = {
  shop: { x: 30, y: 240 },
  pp: { x: 120, y: 205, w: 150, h: 90 },
  cat: { x: 120, y: 370, w: 150, h: 60 },
  rec: { x: 340, y: 90, w: 400, h: 360 },
  db: { x: 820, y: 200, w: 150, h: 120 },
  other: { x: 340, y: 470, w: 400, h: 44 },
};

function slotPos(index: number): Point {
  const col = index % 10;
  const row = Math.floor(index / 10);
  return { x: X.rec.x + 32 + col * 34, y: X.rec.y + 64 + row * 30 };
}

function queuePos(index: number): Point {
  const per = 36;
  const col = index % per;
  const row = Math.floor(index / per);
  return { x: X.rec.x + 24 + col * 10.2, y: X.rec.y + 238 + row * 14 };
}

function lerp(a: Point, b: Point, k: number): Point {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = "#cbbfb3";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = "#cbbfb3";
  ctx.fill();
  ctx.lineWidth = 1;
}

function box(ctx: CanvasRenderingContext2D, shape: Box, title: string, sub: string, stroke = C.line) {
  ctx.fillStyle = "#fff";
  rounded(ctx, shape.x, shape.y, shape.w, shape.h, 10);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;
  text(ctx, title, shape.x + 12, shape.y + 22, 13.5, C.ink, 650);
  if (sub) text(ctx, sub, shape.x + 12, shape.y + 40, 12);
}

export function drawXray(ctx: CanvasRenderingContext2D, engine: ChapterSimEngine, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  text(ctx, "Shoppers", X.shop.x - 6, X.shop.y - 42, 13, C.ink, 650);
  arrow(ctx, X.shop.x + 50, X.shop.y + 5, X.pp.x, X.pp.y + 45);
  arrow(ctx, X.pp.x + X.pp.w, X.pp.y + 40, X.rec.x, X.rec.y + 150);
  arrow(ctx, X.pp.x + 75, X.pp.y + X.pp.h, X.pp.x + 75, X.cat.y);
  arrow(ctx, X.rec.x + X.rec.w, X.rec.y + 110, X.db.x, X.db.y + 60);
  arrow(ctx, X.rec.x + 200, X.other.y, X.rec.x + 200, X.rec.y + X.rec.h);
  const exposure = Math.round(engine.exposure() * 100);
  box(ctx, X.pp, "Product Page", `flag ${exposure}% · ${CHAPTER1_MODEL.ppInstances} instances`);
  box(ctx, X.cat, "Catalog", "fast, no pool");
  const full = engine.busy.length >= CHAPTER1_MODEL.pool;
  box(
    ctx,
    X.rec,
    "Recommendation Service",
    `pool: ${CHAPTER1_MODEL.pool} database connections`,
    full ? C.amber : C.line,
  );
  for (let i = 0; i < CHAPTER1_MODEL.pool; i += 1) {
    const spot = slotPos(i);
    const used = engine.busy.some((request) => request.slot === i);
    ctx.fillStyle = used ? (full ? C.amber : C.steel) : "#fff";
    ctx.strokeStyle = full ? C.amber : C.steel;
    rounded(ctx, spot.x, spot.y, 24, 22, 4);
    ctx.fill();
    ctx.stroke();
  }
  text(
    ctx,
    "waiting for a connection",
    X.rec.x + 24,
    X.rec.y + 226,
    12.5,
    engine.queue.length ? C.amber : C.muted,
    650,
  );
  const waiting = engine.queue.length;
  for (let i = 0; i < Math.min(waiting, 180); i += 1) {
    const spot = queuePos(i);
    ctx.fillStyle = C.amber;
    rounded(ctx, spot.x, spot.y, 6, 10, 2);
    ctx.fill();
  }
  if (waiting > 180) text(ctx, `+${waiting - 180}`, X.rec.x + X.rec.w - 48, X.rec.y + 340, 12, C.amber, 700);
  if (!waiting) text(ctx, "no one waiting", X.rec.x + 24, X.rec.y + 250, 12);

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(X.db.x + 75, X.db.y + 16, 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  rounded(ctx, X.db.x + 5, X.db.y + 16, 140, X.db.h - 16, 6);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  text(ctx, "PostgreSQL", X.db.x + 20, X.db.y + 56, 13.5, C.ink, 650);
  text(ctx, "SQL ~22 ms", X.db.x + 20, X.db.y + 76, 12);
  text(ctx, "shared with Checkout", X.db.x + 20, X.db.y + 94, 12);
  box(ctx, X.other, "Home page + checkout also borrow from this pool", "");

  for (const request of engine.sprites) {
    const point = requestPoint(engine, request);
    if (!point) continue;
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, request.maya ? 6 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (request.maya) {
      ctx.strokeStyle = C.copper;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      text(ctx, "Maya", point.x + 14, point.y - 8, 12, C.copper, 700);
    }
  }

  for (let i = 0; i < 20; i += 1) {
    const y = X.shop.y - 25 + (i % 10) * 6;
    const x = X.shop.x + Math.floor(i / 10) * 12;
    ctx.fillStyle = "#b9aea4";
    ctx.beginPath();
    ctx.arc(x + 8, y + (i % 3), 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (engine.flagOffAt != null) {
    const seen = engine.instancesSeen();
    text(
      ctx,
      `${seen} of 8 Product Page instances have seen the flag change · ${Math.round(engine.t - engine.flagOffAt)} s since you flipped it`,
      X.pp.x,
      X.pp.y - 14,
      12.5,
      seen === 8 ? C.ok : C.copper,
      650,
    );
  }
  ctx.restore();
}

function requestPoint(engine: ChapterSimEngine, request: SimRequest) {
  const age = engine.t - request.arr;
  if (request.state === "travel") {
    const k = Math.min(1, age / Math.max(0.02, request.reachRec - request.arr));
    const point =
      request.kind === "page"
        ? lerp({ x: X.shop.x + 40, y: X.shop.y }, { x: X.rec.x, y: X.rec.y + 150 }, k)
        : lerp({ x: X.rec.x + 200, y: X.other.y }, { x: X.rec.x + 200, y: X.rec.y + X.rec.h }, k);
    return { ...point, color: C.steel };
  }
  if (request.state === "queue") {
    const index = engine.queue.indexOf(request);
    if (index < 0) return null;
    const spot = queuePos(index);
    return { x: spot.x + 3, y: spot.y + 5, color: C.amber };
  }
  if (request.state === "hold") {
    const spot = slotPos(request.slot);
    const heldFor = engine.t - (request.release - request.hold);
    const sqlPhase = heldFor >= (request.hold - request.sql) / 2 && heldFor < request.hold - (request.hold - request.sql) / 2;
    return { x: spot.x + 12, y: spot.y + 11, color: sqlPhase ? C.violet : C.steel };
  }
  return null;
}

export function paintStage(
  ctx: CanvasRenderingContext2D,
  engine: ChapterSimEngine,
  mix: number,
  reduced: boolean,
) {
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, STAGE.width, STAGE.height);
  drawCustomer(ctx, engine, 1 - mix, reduced);
  drawXray(ctx, engine, mix);
}
