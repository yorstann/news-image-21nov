// The World Today — Saturday 21 November 2026.
// A program that draws one day's world news as a broadsheet front page and
// writes it to entry.png. Node standard library only: its own rasterizer,
// its own 5x7 bitmap font, and its own PNG encoder (zlib for the deflate).

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font ----
// 5x7 glyphs, one number per row, low 5 bits, MSB = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],       J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],    T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],  X: [17, 10, 4, 4, 4, 10, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],      Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15],     b: [16, 16, 22, 25, 17, 17, 30],
  c: [0, 0, 14, 16, 16, 17, 14],    d: [1, 1, 13, 19, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],    f: [6, 9, 8, 28, 8, 8, 8],
  g: [0, 0, 15, 17, 15, 1, 14],     h: [16, 16, 22, 25, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],       j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18],  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21],    n: [0, 0, 22, 25, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],    p: [0, 0, 22, 25, 30, 16, 16],
  q: [0, 0, 13, 19, 15, 1, 1],      r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],     t: [8, 8, 28, 8, 8, 8, 14],
  u: [0, 0, 17, 17, 17, 19, 13],    v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10],    x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],     z: [0, 0, 31, 2, 4, 8, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],     '3': [14, 17, 1, 6, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],     '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],   '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],   '-': [0, 0, 0, 31, 0, 0, 0],
  ':': [0, 12, 12, 0, 12, 12, 0], ';': [0, 12, 12, 0, 12, 4, 8],
  '!': [4, 4, 4, 4, 4, 0, 4],   '?': [14, 17, 1, 2, 4, 0, 4],
  '%': [24, 25, 2, 4, 8, 19, 3], '&': [12, 18, 20, 8, 21, 18, 13],
  '$': [4, 15, 20, 14, 5, 30, 4], '£': [6, 9, 8, 30, 8, 8, 31],
  '/': [1, 1, 2, 4, 8, 16, 16], '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],   '"': [10, 10, 0, 0, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],  '=': [0, 0, 31, 0, 31, 0, 0],
  '·': [0, 0, 0, 12, 12, 0, 0], '°': [12, 18, 18, 12, 0, 0, 0],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

function normalize(s: string): string {
  return s
    .replace(/[—–−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ü/g, 'u')
    .replace(/é/g, 'e');
}

// ------------------------------------------------------------- canvas ----
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 229];
const INK: RGB = [24, 22, 20];
const ACCENT: RGB = [163, 22, 33];
const BLUE: RGB = [32, 80, 122];
const GREEN: RGB = [62, 125, 58];
const GOLD: RGB = [224, 168, 28];
const PANEL: RGB = [233, 240, 241];
const QUOTE_BG: RGB = [238, 230, 214];
const FAINT: RGB = [120, 112, 98];

class Canvas {
  w: number; h: number; px: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w; this.h = h; this.px = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 3] = bg[0]; this.px[i * 3 + 1] = bg[1]; this.px[i * 3 + 2] = bg[2];
    }
  }
  set(x: number, y: number, c: RGB) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w)), y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++)
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
      }
  }
  rectOutline(x: number, y: number, w: number, h: number, c: RGB, t = 2) {
    this.fillRect(x, y, w, t, c); this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c); this.fillRect(x + w - t, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + (dx * i) / steps, y = y0 + (dy * i) / steps;
      this.fillRect(x - t / 2, y - t / 2, t, t, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 2) {
    const steps = Math.ceil(2 * Math.PI * r * 2);
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      this.fillRect(cx + Math.cos(a) * r - t / 2, cy + Math.sin(a) * r - t / 2, t, t, c);
    }
  }
  poly(pts: [number, number][], c: RGB) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        this.fillRect(xs[i], y, xs[i + 1] - xs[i] + 1, 1, c);
    }
  }
}

// --------------------------------------------------------------- text ----
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale;
}
function drawText(
  cv: Canvas, x: number, y: number, raw: string,
  opt: { scale?: number; color?: RGB; bold?: boolean; align?: 'left' | 'center' | 'right' } = {},
) {
  const scale = opt.scale ?? 2, color = opt.color ?? INK, bold = opt.bold ?? false;
  const s = normalize(raw);
  let sx = x;
  const w = textWidth(s, scale);
  if (opt.align === 'center') sx = x - w / 2;
  if (opt.align === 'right') sx = x - w;
  const off = bold ? (scale >= 5 ? 2 : 1) : 0;
  for (let ci = 0; ci < s.length; ci++) {
    const glyph = FONT[s[ci]] ?? FONT[' '];
    const gx = sx + ci * 6 * scale;
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (glyph[r] & (16 >> col)) {
          cv.fillRect(gx + col * scale, y + r * scale, scale, scale, color);
          if (off) cv.fillRect(gx + col * scale + off, y + r * scale, scale, scale, color);
        }
  }
  return w;
}
function wrapText(raw: string, maxChars: number): string[] {
  const words = normalize(raw).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if (cur && cur.length + 1 + word.length > maxChars) { lines.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawParagraph(
  cv: Canvas, x: number, y: number, raw: string,
  opt: { scale?: number; color?: RGB; bold?: boolean; maxChars: number; lineH: number },
): number {
  const lines = wrapText(raw, opt.maxChars);
  lines.forEach((ln, i) =>
    drawText(cv, x, y + i * opt.lineH, ln, { scale: opt.scale ?? 2, color: opt.color, bold: opt.bold }));
  return lines.length;
}

// ---------------------------------------------------------------- png ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(cv.h * (1 + cv.w * 3));
  for (let y = 0; y < cv.h; y++) {
    raw[y * (1 + cv.w * 3)] = 0;
    Buffer.from(cv.px.buffer, y * cv.w * 3, cv.w * 3).copy(raw, y * (1 + cv.w * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- icons ---
function iconMissile(cv: Canvas, x: number, y: number) {
  cv.poly([[x + 30, y + 2], [x + 35, y + 7], [x + 21, y + 21], [x + 15, y + 15]], INK);
  cv.poly([[x + 15, y + 15], [x + 8, y + 14], [x + 12, y + 22]], INK);
  cv.poly([[x + 21, y + 21], [x + 22, y + 28], [x + 14, y + 24]], INK);
  cv.poly([[x + 13, y + 23], [x + 6, y + 34], [x + 17, y + 29]], ACCENT);
}
function iconChart(cv: Canvas, x: number, y: number) {
  cv.line(x + 3, y + 4, x + 3, y + 32, INK, 2);
  cv.line(x + 3, y + 32, x + 34, y + 32, INK, 2);
  const pts: [number, number][] = [[6, 8], [13, 15], [19, 10], [26, 21], [32, 27]];
  for (let i = 0; i + 1 < pts.length; i++)
    cv.line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], ACCENT, 3);
  cv.poly([[x + 32, y + 27], [x + 25, y + 26], [x + 31, y + 33]], ACCENT);
}
function iconScales(cv: Canvas, x: number, y: number) {
  cv.line(x + 18, y + 6, x + 18, y + 30, INK, 3);
  cv.line(x + 4, y + 8, x + 32, y + 8, INK, 3);
  cv.circle(x + 18, y + 4, 3, INK);
  for (const px of [7, 29]) {
    cv.line(x + px, y + 8, x + px - 4, y + 20, INK, 2);
    cv.line(x + px, y + 8, x + px + 4, y + 20, INK, 2);
    cv.poly([[x + px - 6, y + 20], [x + px + 6, y + 20], [x + px, y + 26]], INK);
  }
  cv.fillRect(x + 9, y + 30, 18, 4, INK);
}
function iconBadge(cv: Canvas, x: number, y: number) {
  cv.ring(x + 18, y + 18, 15, INK, 2);
  const star: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 11 : 4.5;
    star.push([x + 18 + Math.cos(a) * r, y + 18 + Math.sin(a) * r]);
  }
  cv.poly(star, ACCENT);
}
function iconPlanet(cv: Canvas, x: number, y: number) {
  cv.circle(x + 17, y + 18, 10, BLUE);
  cv.circle(x + 14, y + 14, 3, GREEN);
  cv.circle(x + 21, y + 22, 4, GREEN);
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * 2 * Math.PI;
    cv.set(x + 17 + Math.cos(a) * 16, y + 18 + Math.sin(a) * 6, INK);
    cv.set(x + 17 + Math.cos(a) * 16, y + 19 + Math.sin(a) * 6, INK);
  }
  cv.fillRect(x + 28, y + 2, 6, 6, ACCENT);
  cv.line(x + 28, y + 8, x + 24, y + 12, INK, 1);
}
function iconBall(cv: Canvas, x: number, y: number) {
  cv.ring(x + 18, y + 18, 15, INK, 2);
  const pent: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pent.push([x + 18 + Math.cos(a) * 6, y + 18 + Math.sin(a) * 6]);
  }
  cv.poly(pent, INK);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    cv.line(x + 18 + Math.cos(a) * 6, y + 18 + Math.sin(a) * 6,
            x + 18 + Math.cos(a) * 14, y + 18 + Math.sin(a) * 14, INK, 2);
  }
}

// -------------------------------------------------------------- scenes ---
function drawLeadArt(cv: Canvas, x: number, y: number, w: number, h: number) {
  cv.fillRect(x, y, w, h, PANEL);
  // sun with rays
  cv.circle(x + 34, y + 30, 15, GOLD);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    cv.line(x + 34 + Math.cos(a) * 19, y + 30 + Math.sin(a) * 19,
            x + 34 + Math.cos(a) * 25, y + 30 + Math.sin(a) * 25, GOLD, 3);
  }
  // the Earth, warming
  const ex = x + 88, ey = y + 78, er = 58;
  cv.circle(ex, ey, er, BLUE);
  const blob = (bx: number, by: number, r: number) => {
    cv.circle(bx, by, r, GREEN);
    cv.circle(bx + r, by + 3, Math.floor(r * 0.7), GREEN);
    cv.circle(bx - 2, by + r, Math.floor(r * 0.6), GREEN);
  };
  blob(ex - 26, ey - 26, 15); blob(ex + 16, ey - 34, 11); blob(ex - 6, ey + 6, 17);
  blob(ex + 28, ey + 22, 10); blob(ex - 34, ey + 26, 9);
  cv.circle(ex - 14, ey - 8, 7, PAPER); cv.circle(ex + 20, ey + 2, 5, PAPER);
  cv.ring(ex, ey, er, INK, 2);
  // thermometer, mercury high
  const tx = x + w - 52;
  cv.fillRect(tx, y + 22, 16, 100, PAPER);
  cv.rectOutline(tx, y + 22, 16, 100, INK, 2);
  cv.fillRect(tx + 3, y + 40, 10, 82, ACCENT);
  cv.circle(tx + 8, y + 134, 14, ACCENT);
  cv.ring(tx + 8, y + 134, 14, INK, 2);
  for (let i = 0; i < 5; i++) cv.fillRect(tx - 9, y + 36 + i * 18, 7, 2, INK);
  // summit table with flags along the bottom
  cv.fillRect(x + 18, y + h - 48, 250, 10, INK);
  const flagCols = [ACCENT, BLUE, GREEN, GOLD, ACCENT];
  for (let i = 0; i < 5; i++) {
    const fx = x + 34 + i * 52;
    cv.fillRect(fx, y + h - 72, 2, 24, INK);
    cv.fillRect(fx + 2, y + h - 72, 15, 10, flagCols[i]);
  }
  // caption strip
  cv.fillRect(x, y + h - 32, w, 32, INK);
  drawText(cv, x + w / 2, y + h - 23, 'THE SUMMIT THAT WOULD NOT END',
           { scale: 2, color: PAPER, bold: true, align: 'center' });
  cv.rectOutline(x, y, w, h, INK, 2);
}

interface Story {
  section: string; headline: string; summary: string;
  icon: (cv: Canvas, x: number, y: number) => void;
}

function drawBox(cv: Canvas, x: number, y: number, w: number, h: number, st: Story) {
  cv.rectOutline(x, y, w, h, INK, 2);
  cv.fillRect(x, y, w, 5, ACCENT);
  drawText(cv, x + 12, y + 14, st.section, { scale: 2, color: ACCENT, bold: true });
  st.icon(cv, x + w - 48, y + 12);
  const headLines = drawParagraph(cv, x + 12, y + 36, st.headline,
    { scale: 2, bold: true, maxChars: 19, lineH: 19 });
  const ruleY = y + 36 + headLines * 19 + 6;
  cv.fillRect(x + 12, ruleY, w - 24, 1, FAINT);
  drawParagraph(cv, x + 12, ruleY + 10, st.summary,
    { scale: 2, maxChars: 23, lineH: 15 });
}

// ---------------------------------------------------------------- page ---
function render(): Canvas {
  const cv = new Canvas(1024, 1024, PAPER);
  const M = 40, W = 1024 - 2 * M;

  // masthead
  cv.fillRect(M, 26, W, 4, INK); cv.fillRect(M, 34, W, 2, INK);
  drawText(cv, 512, 48, 'THE WORLD TODAY', { scale: 9, bold: true, align: 'center' });
  drawText(cv, M, 124, 'EST. MMXXVI', { scale: 2 });
  drawText(cv, 512, 120, 'SATURDAY 21 NOVEMBER 2026', { scale: 3, bold: true, align: 'center' });
  drawText(cv, 1024 - M, 124, 'PICTURE EDITION', { scale: 2, align: 'right' });
  cv.fillRect(M, 146, W, 5, INK); cv.fillRect(M, 155, W, 2, INK);

  // lead story
  const kw = drawText(cv, M, 168, 'CLIMATE', { scale: 3, color: ACCENT, bold: true });
  drawText(cv, M + kw + 12, 168, '- THE LEAD STORY', { scale: 3 });
  drawText(cv, M, 196, 'COP31 TALKS RUN INTO OVERTIME', { scale: 5, bold: true });
  drawParagraph(cv, M, 246,
    "Nearly 200 countries missed Friday's deadline at the COP31 summit in Antalya " +
    'and talked through Saturday, still split over fossil fuels and money for ' +
    'poorer nations; the EU warned it would be a good deal or no deal at all.',
    { scale: 2, maxChars: 46, lineH: 16 });
  // pull-quote box
  const qy = 354;
  cv.fillRect(M, qy, 556, 74, QUOTE_BG);
  cv.fillRect(M, qy, 6, 74, ACCENT);
  const qLines = drawParagraph(cv, M + 22, qy + 10, '"A GOOD DEAL OR NO DEAL AT ALL"',
    { scale: 3, bold: true, maxChars: 29, lineH: 23 });
  drawText(cv, M + 22, qy + 10 + qLines * 23 + 4, "- THE EU'S WARNING AT ANTALYA",
           { scale: 2, color: ACCENT });
  // lead illustration
  drawLeadArt(cv, 620, 246, 364, 182);
  cv.fillRect(M, 442, W, 2, INK);

  // six boxed stories, two rows of three
  const stories: Story[] = [
    { section: 'WORLD', icon: iconMissile,
      headline: 'RUSSIAN MISSILES FALL IN POLAND',
      summary: "Warsaw called the strikes a deliberate provocation during a huge attack on Ukraine, where a missile hit the president's hometown Kryvyi Rih, killing two and wounding 60." },
    { section: 'MARKETS', icon: iconChart,
      headline: 'AI SELL-OFF SLIDES WORLD MARKETS',
      summary: "Fears that AI spending will not pay off drove a global rout - the S&P 500 fell 3.7%, Japan's Nikkei 5.1%, and the Nasdaq erased its gains for 2026." },
    { section: 'JUSTICE', icon: iconScales,
      headline: 'UN COURT: MYANMAR COMMITTED GENOCIDE',
      summary: 'The International Court of Justice found Myanmar responsible for genocide against the Rohingya; Bangladesh vowed to seek compensation.' },
    { section: 'AMERICAS', icon: iconBadge,
      headline: "MEXICO CAPTURES 'EL CHAPO ISIDRO'",
      summary: 'Mexican forces seized Fausto Isidro Meza Flores, an FBI most-wanted cartel boss, in a special-forces raid in Guasave, Sinaloa - and violence erupted in its wake.' },
    { section: 'SCIENCE', icon: iconPlanet,
      headline: 'EIGHT-YEAR VOYAGE ENDS AT MERCURY',
      summary: "Europe and Japan's BepiColombo entered orbit around Mercury, only the second spacecraft ever to orbit the innermost planet; it launched in 2018 and its two probes separate in December." },
    { section: 'SPORT', icon: iconBall,
      headline: 'LEEDS STUN CHELSEA 4-1 AT THE BRIDGE',
      summary: 'Noah Okafor scored twice as Leeds won at Stamford Bridge for the first time since 1999, handing Chelsea a third straight defeat and climbing above them into sixth.' },
  ];
  const bw = 300, bh = 257, gapX = 22, gapY = 14, gy = 458;
  stories.forEach((st, i) => {
    const cx = M + (i % 3) * (bw + gapX);
    const cy = gy + Math.floor(i / 3) * (bh + gapY);
    drawBox(cv, cx, cy, bw, bh, st);
  });

  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG(render());
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`entry.png: ${png.length} bytes`);
