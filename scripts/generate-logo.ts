// Generates src/lib/logo.ts with the outlines of «+MAT» in Playfair Display 600, read from the @fontsource .woff.
// This way the logo is an SVG and Playfair is never downloaded. Run it once: node scripts/generate-logo.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

interface Point {
  x: number;
  y: number;
  onCurve: boolean;
}

const TEXT = '+MAT';
const woff = readFileSync(
  new URL('../node_modules/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff', import.meta.url),
);

const tables: Record<string, Buffer> = {};
for (let i = 0, count = woff.readUInt16BE(12); i < count; i++) {
  const entry = 44 + i * 20;
  const tag = woff.toString('latin1', entry, entry + 4);
  const offset = woff.readUInt32BE(entry + 4);
  const compressedLength = woff.readUInt32BE(entry + 8);
  const originalLength = woff.readUInt32BE(entry + 12);
  const data = woff.subarray(offset, offset + compressedLength);
  tables[tag] = compressedLength < originalLength ? inflateSync(data) : data;
}
const { head, hhea, hmtx, loca, glyf, cmap } = tables;
const longOffsets = head.readInt16BE(50) === 1;
const metricCount = hhea.readUInt16BE(34);

function glyphIndex(codePoint: number): number {
  for (let i = 0, count = cmap.readUInt16BE(2); i < count; i++) {
    const start = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(4 + i * 8) !== 3 || cmap.readUInt16BE(start) !== 4) continue;
    const segments = cmap.readUInt16BE(start + 6) / 2;
    const ends = start + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const rangeOffsets = deltas + segments * 2;
    for (let s = 0; s < segments; s++) {
      if (codePoint > cmap.readUInt16BE(ends + s * 2) || codePoint < cmap.readUInt16BE(starts + s * 2)) continue;
      const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
      const glyph = rangeOffset
        ? cmap.readUInt16BE(rangeOffsets + s * 2 + rangeOffset + (codePoint - cmap.readUInt16BE(starts + s * 2)) * 2)
        : codePoint;
      return (glyph + cmap.readInt16BE(deltas + s * 2)) & 0xffff;
    }
  }
  throw new Error(`The character ${String.fromCharCode(codePoint)} is not in the font.`);
}

const advanceWidth = (glyph: number) => hmtx.readUInt16BE(Math.min(glyph, metricCount - 1) * 4);
const glyphOffset = (glyph: number) => (longOffsets ? loca.readUInt32BE(glyph * 4) : loca.readUInt16BE(glyph * 2) * 2);

function glyphContours(glyph: number): Point[][] {
  const offset = glyphOffset(glyph);
  if (glyphOffset(glyph + 1) === offset) return [];
  const contourCount = glyf.readInt16BE(offset);
  if (contourCount < 0) throw new Error(`Glyph ${glyph} is composite: this script only reads simple glyphs.`);
  const ends = Array.from({ length: contourCount }, (_, i) => glyf.readUInt16BE(offset + 10 + i * 2));
  const pointCount = ends.at(-1)! + 1;
  let p = offset + 10 + contourCount * 2;
  p += 2 + glyf.readUInt16BE(p);
  const flags: number[] = [];
  while (flags.length < pointCount) {
    const flag = glyf[p++];
    flags.push(flag);
    if (flag & 8) for (let repeat = glyf[p++]; repeat > 0; repeat--) flags.push(flag);
  }
  const readCoordinates = (shortFlag: number, sameFlag: number) => {
    let value = 0;
    return flags.map((flag) => {
      if (flag & shortFlag) value += flag & sameFlag ? glyf[p++] : -glyf[p++];
      else if (!(flag & sameFlag)) {
        value += glyf.readInt16BE(p);
        p += 2;
      }
      return value;
    });
  };
  const xs = readCoordinates(2, 16);
  const ys = readCoordinates(4, 32);
  let start = 0;
  return ends.map((end) => {
    const contour: Point[] = [];
    for (let i = start; i <= end; i++) contour.push({ x: xs[i], y: ys[i], onCurve: !!(flags[i] & 1) });
    start = end + 1;
    return contour;
  });
}

// TrueType quadratic curves: between two consecutive control points there is an implied on-curve point halfway.
function svgPath(contour: Point[], dx: number): string {
  const points: Point[] = [];
  contour.forEach((point, i) => {
    const previous = contour[(i - 1 + contour.length) % contour.length];
    if (!point.onCurve && !previous.onCurve)
      points.push({ x: (point.x + previous.x) / 2, y: (point.y + previous.y) / 2, onCurve: true });
    points.push(point);
  });
  const first = points.findIndex((point) => point.onCurve);
  const ordered = [...points.slice(first), ...points.slice(0, first)];
  const format = (point: Point) => `${Math.round(point.x + dx)} ${Math.round(-point.y)}`;
  let d = `M${format(ordered[0])}`;
  for (let i = 1; i <= ordered.length; i++) {
    const point = ordered[i % ordered.length];
    if (point.onCurve) d += `L${format(point)}`;
    else {
      d += `Q${format(point)} ${format(ordered[(i + 1) % ordered.length])}`;
      i++;
    }
  }
  return d + 'Z';
}

let x = 0;
let left = Infinity;
let right = 0;
let top = 0;
let bottom = 0;
let outline = '';
for (const char of TEXT) {
  const glyph = glyphIndex(char.codePointAt(0)!);
  const offset = glyphOffset(glyph);
  if (glyphOffset(glyph + 1) > offset) {
    left = Math.min(left, x + glyf.readInt16BE(offset + 2));
    right = Math.max(right, x + glyf.readInt16BE(offset + 6));
    top = Math.max(top, glyf.readInt16BE(offset + 8));
    bottom = Math.min(bottom, glyf.readInt16BE(offset + 4));
  }
  for (const contour of glyphContours(glyph)) outline += svgPath(contour, x);
  x += advanceWidth(glyph);
}

writeFileSync(
  new URL('../src/lib/logo.ts', import.meta.url),
  `// Generated by scripts/generate-logo.ts: «${TEXT}» in Playfair Display 600.\n` +
    `export const viewBox = '${left} ${-top} ${right - left} ${top - bottom}';\nexport const outline = '${outline}';\n`,
);
console.log(`src/lib/logo.ts: ${outline.length} characters, box ${right - left}×${top - bottom}`);
