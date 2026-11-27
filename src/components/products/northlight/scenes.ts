import type { Scene } from "@/lib/products/northlight";

type Ctx = CanvasRenderingContext2D;

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function sky(ctx: Ctx, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function ridge(ctx: Ctx, w: number, h: number, base: number, amp: number, offset: number, seed: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += Math.max(2, w / 160)) {
    const u = (x + offset) / w;
    const y = base - amp * (0.55 * Math.sin(u * 5.1 + seed) + 0.3 * Math.sin(u * 11.7 + seed * 2) + 0.15 * Math.sin(u * 23.3 + seed * 3));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function stars(ctx: Ctx, w: number, h: number, t: number, count: number, maxY: number) {
  for (let i = 0; i < count; i++) {
    const x = hash(i) * w;
    const y = hash(i + 99) * maxY;
    const a = 0.35 + 0.5 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, Math.max(1, w / 900), Math.max(1, w / 900));
  }
}

function snow(ctx: Ctx, w: number, h: number, t: number, count: number) {
  ctx.fillStyle = "rgba(240,244,248,0.8)";
  for (let i = 0; i < count; i++) {
    const speed = 0.4 + hash(i + 7) * 0.8;
    const x = (hash(i) * w + Math.sin(t * 0.8 + i) * w * 0.01 + t * w * 0.006) % w;
    const y = (hash(i + 31) * h + t * h * 0.05 * speed) % h;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, (w / 900) * (0.8 + hash(i + 3))), 0, Math.PI * 2);
    ctx.fill();
  }
}

function coast(ctx: Ctx, t: number, w: number, h: number) {
  sky(ctx, w, h, [
    [0, "#0d1a28"],
    [0.42, "#2c4559"],
    [0.58, "#c99a6a"],
    [0.6, "#13283a"],
    [1, "#0a1722"],
  ]);
  const sunX = w * 0.7;
  const sunY = h * 0.55;
  ctx.fillStyle = "rgba(240,194,122,0.16)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c27e";
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ridge(ctx, w, h, h * 0.52, h * 0.08, t * w * 0.004, 1.3, "#233a4e");
  ridge(ctx, w, h, h * 0.58, h * 0.06, t * w * 0.009, 4.1, "#152a3b");
  ctx.fillStyle = "#11263a";
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  for (let i = 0; i < 26; i++) {
    const y = h * 0.605 + Math.pow(i, 1.45) * h * 0.0062;
    ctx.strokeStyle = `rgba(205,218,226,${0.07 + i * 0.006})`;
    ctx.lineWidth = Math.max(0.6, (w / 1400) * (1 + i * 0.12));
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 90) {
      const wobble = Math.sin(x / w * 18 + t * (0.9 + i * 0.05) + i) * h * 0.002 * (1 + i * 0.2);
      if (x === 0) ctx.moveTo(x, y + wobble);
      else ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const y = h * 0.62 + i * h * 0.014;
    const half = (w * 0.012 + i * w * 0.004) * (0.6 + 0.4 * Math.abs(Math.sin(t * 2.3 + i * 1.7)));
    ctx.fillStyle = `rgba(242,194,126,${0.5 - i * 0.025})`;
    ctx.fillRect(sunX - half, y, half * 2, Math.max(1, h * 0.003));
  }
  const fx = ((t * w * 0.025) % (w * 1.3)) - w * 0.15;
  const fy = h * 0.6;
  ctx.fillStyle = "#081018";
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + w * 0.11, fy);
  ctx.lineTo(fx + w * 0.1, fy + h * 0.018);
  ctx.lineTo(fx + w * 0.008, fy + h * 0.018);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(fx + w * 0.03, fy - h * 0.022, w * 0.05, h * 0.022);
  ctx.fillRect(fx + w * 0.07, fy - h * 0.05, w * 0.004, h * 0.03);
  ctx.fillStyle = Math.sin(t * 4) > 0 ? "#ffd27a" : "#a47a3a";
  ctx.fillRect(fx + w * 0.036, fy - h * 0.014, w * 0.004, h * 0.006);
  ctx.fillRect(fx + w * 0.05, fy - h * 0.014, w * 0.004, h * 0.006);
  snow(ctx, w, h, t, 90);
}

function ice(ctx: Ctx, t: number, w: number, h: number) {
  sky(ctx, w, h, [
    [0, "#050a16"],
    [0.55, "#14223a"],
    [0.56, "#9fb3c8"],
    [1, "#dfe8f1"],
  ]);
  stars(ctx, w, h, t, 140, h * 0.5);
  for (let band = 0; band < 3; band++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 80) {
      const y = h * (0.18 + band * 0.07) + Math.sin(x / w * 6 + t * 0.35 + band) * h * 0.05 + Math.sin(x / w * 13 - t * 0.2) * h * 0.02;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = band === 1 ? "rgba(120,240,190,0.32)" : "rgba(90,200,170,0.2)";
    ctx.lineWidth = h * (0.05 - band * 0.012);
    ctx.stroke();
  }
  ridge(ctx, w, h, h * 0.56, h * 0.025, 0, 2.2, "#2a3a52");
  ctx.fillStyle = "#c9d6e3";
  ctx.fillRect(0, h * 0.56, w, h * 0.44);
  ctx.strokeStyle = "rgba(90,110,140,0.35)";
  ctx.lineWidth = Math.max(0.6, w / 1500);
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    const x = hash(i + 5) * w;
    const y = h * (0.6 + hash(i + 9) * 0.38);
    ctx.moveTo(x, y);
    ctx.lineTo(x + (hash(i) - 0.5) * w * 0.2, y + hash(i + 2) * h * 0.04);
    ctx.stroke();
  }
  const vx = w * 0.5;
  const vy = h * 0.565;
  ctx.strokeStyle = "rgba(60,75,100,0.5)";
  ctx.lineWidth = Math.max(1, w / 700);
  ctx.beginPath();
  ctx.moveTo(vx - w * 0.01, vy);
  ctx.lineTo(w * 0.2, h);
  ctx.moveTo(vx + w * 0.01, vy);
  ctx.lineTo(w * 0.8, h);
  ctx.stroke();
  const k = (t * 0.06) % 1;
  const scale = 0.05 + k * 0.9;
  const ty = vy + (h - vy) * k * 0.8;
  for (const side of [-1, 1]) {
    const lx = vx + side * w * 0.03 * scale;
    ctx.fillStyle = "rgba(255,240,200,0.18)";
    ctx.beginPath();
    ctx.arc(lx, ty, w * 0.03 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6dc";
    ctx.beginPath();
    ctx.arc(lx, ty, w * 0.008 * scale + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  snow(ctx, w, h, t * 1.6, 60);
}

function market(ctx: Ctx, t: number, w: number, h: number) {
  ctx.fillStyle = "#170d12";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const x = (hash(i) * w + Math.sin(t * 0.3 + i) * w * 0.01) % w;
    const y = hash(i + 50) * h * 0.7;
    const r = h * (0.02 + hash(i + 11) * 0.06);
    const warm = ["240,163,94", "217,71,91", "250,214,140"][i % 3];
    ctx.fillStyle = `rgba(${warm},${0.06 + hash(i + 3) * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let row = 0; row < 2; row++) {
    const baseY = h * (0.14 + row * 0.12);
    ctx.strokeStyle = "rgba(40,25,30,0.9)";
    ctx.lineWidth = Math.max(1, w / 900);
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.quadraticCurveTo(w / 2, baseY + h * 0.08, w, baseY);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9;
      const x = u * w + Math.sin(t * 1.2 + i + row) * w * 0.004;
      const y = baseY + h * 0.08 * 4 * u * (1 - u) + h * 0.03;
      ctx.fillStyle = i % 2 ? "#e2513f" : "#f0a35e";
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.014, h * 0.032, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,210,150,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, h * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#0c0709";
  for (let i = 0; i < 5; i++) {
    const x = i * w * 0.22 - w * 0.02;
    ctx.fillRect(x, h * 0.62, w * 0.18, h * 0.38);
    ctx.fillStyle = "#2a1a1a";
    ctx.fillRect(x + w * 0.02, h * 0.66, w * 0.14, h * 0.05);
    ctx.fillStyle = "#0c0709";
  }
  for (let s = 0; s < 3; s++) {
    ctx.strokeStyle = "rgba(230,220,210,0.12)";
    ctx.lineWidth = Math.max(2, w / 220);
    ctx.beginPath();
    const sx = w * (0.28 + s * 0.04);
    for (let y = h * 0.66; y > h * 0.3; y -= h * 0.02) {
      const x = sx + Math.sin(y / h * 14 + t * 1.5 + s) * w * 0.012;
      if (y === h * 0.66) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function glass(ctx: Ctx, t: number, w: number, h: number) {
  ctx.fillStyle = "#0b1717";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(240,140,60,0.25)";
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.55, h * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6a04a";
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.55, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = t * 0.2 + (i * Math.PI * 2) / 7;
    ctx.save();
    ctx.translate(w * 0.5 + Math.cos(a) * w * 0.25, h * 0.5 + Math.sin(a) * h * 0.28);
    ctx.rotate(a * 2);
    ctx.strokeStyle = "rgba(95,196,184,0.7)";
    ctx.fillStyle = "rgba(95,196,184,0.12)";
    ctx.lineWidth = Math.max(1, w / 600);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const r = h * 0.06 * (k % 2 ? 0.6 : 1);
      ctx.lineTo(Math.cos((k * Math.PI) / 3) * r, Math.sin((k * Math.PI) / 3) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function fields(ctx: Ctx, t: number, w: number, h: number) {
  sky(ctx, w, h, [
    [0, "#bcd3e2"],
    [0.45, "#eef0e6"],
    [0.46, "#6c8a3c"],
    [1, "#3e5a22"],
  ]);
  const colors = ["#e46a4b", "#f2c94c", "#d9477a", "#f4efe4", "#e46a4b", "#8e4fb0"];
  const vy = h * 0.45;
  for (let i = -8; i < 9; i++) {
    const x0 = w / 2 + i * w * 0.12;
    const x1 = w / 2 + (i + 1) * w * 0.12;
    ctx.fillStyle = colors[(i + 12) % colors.length];
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.006, vy);
    ctx.lineTo(w / 2 + (i + 0.5) * w * 0.006, vy);
    ctx.lineTo(x1 - w * 0.03, h);
    ctx.lineTo(x0, h);
    ctx.closePath();
    ctx.fill();
  }
  const mx = w * 0.78;
  const my = h * 0.34;
  ctx.fillStyle = "#3a2e26";
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.02, vy + 2);
  ctx.lineTo(mx - w * 0.01, my);
  ctx.lineTo(mx + w * 0.01, my);
  ctx.lineTo(mx + w * 0.02, vy + 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2e26";
  ctx.lineWidth = Math.max(1.5, w / 500);
  for (let b = 0; b < 4; b++) {
    const a = t * 0.8 + (b * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(a) * h * 0.12, my + Math.sin(a) * h * 0.12);
    ctx.stroke();
  }
}

function foundry(ctx: Ctx, t: number, w: number, h: number) {
  ctx.fillStyle = "#120c0a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(226,118,58,0.18)";
  ctx.beginPath();
  ctx.arc(w * 0.45, h * 0.75, h * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f39a4c";
  ctx.lineWidth = Math.max(3, w / 160);
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.35);
  ctx.quadraticCurveTo(w * 0.42, h * 0.38, w * 0.45, h * 0.7);
  ctx.stroke();
  ctx.fillStyle = "#2b211c";
  ctx.fillRect(w * 0.18, h * 0.26, w * 0.14, h * 0.12);
  ctx.fillRect(w * 0.36, h * 0.7, w * 0.2, h * 0.22);
  for (let i = 0; i < 60; i++) {
    const life = (t * 0.9 + hash(i)) % 1;
    const x = w * 0.45 + (hash(i + 4) - 0.5) * w * 0.3 * life;
    const y = h * 0.7 - Math.sin(life * Math.PI) * h * 0.25 * hash(i + 8);
    ctx.fillStyle = `rgba(255,${180 + Math.floor(hash(i) * 60)},120,${1 - life})`;
    ctx.fillRect(x, y, Math.max(1, w / 700), Math.max(1, w / 700));
  }
}

const SCENES: Record<Scene, (ctx: Ctx, t: number, w: number, h: number) => void> = {
  coast,
  ice,
  market,
  glass,
  fields,
  foundry,
};

export function drawScene(ctx: Ctx, scene: Scene, t: number, w: number, h: number) {
  SCENES[scene](ctx, t, w, h);
}
