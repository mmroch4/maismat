// Gera src/lib/logotipo.ts com os contornos do «+MAT» em Playfair Display 600, tirados do .woff do @fontsource.
// Assim o logótipo é um SVG e a Playfair não é descarregada. Corre-se uma vez: node scripts/logotipo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const TEXTO = '+MAT';
const woff = readFileSync(
  new URL('../node_modules/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff', import.meta.url),
);

const tabelas = {};
for (let i = 0, n = woff.readUInt16BE(12); i < n; i++) {
  const e = 44 + i * 20;
  const [tag, inicio, comprimido, original] = [
    woff.toString('latin1', e, e + 4),
    woff.readUInt32BE(e + 4),
    woff.readUInt32BE(e + 8),
    woff.readUInt32BE(e + 12),
  ];
  const dados = woff.subarray(inicio, inicio + comprimido);
  tabelas[tag] = comprimido < original ? inflateSync(dados) : dados;
}
const { head, hhea, hmtx, loca, glyf, cmap } = tabelas;
const longa = head.readInt16BE(50) === 1;
const metricas = hhea.readUInt16BE(34);

function glifoDe(codigo) {
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const inicio = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(4 + i * 8) !== 3 || cmap.readUInt16BE(inicio) !== 4) continue;
    const segs = cmap.readUInt16BE(inicio + 6) / 2;
    const fins = inicio + 14,
      comecos = fins + segs * 2 + 2,
      deltas = comecos + segs * 2,
      desvios = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      if (codigo > cmap.readUInt16BE(fins + s * 2) || codigo < cmap.readUInt16BE(comecos + s * 2)) continue;
      const desvio = cmap.readUInt16BE(desvios + s * 2);
      const g = desvio
        ? cmap.readUInt16BE(desvios + s * 2 + desvio + (codigo - cmap.readUInt16BE(comecos + s * 2)) * 2)
        : codigo;
      return (g + cmap.readInt16BE(deltas + s * 2)) & 0xffff;
    }
  }
  throw new Error(`O carácter ${String.fromCharCode(codigo)} não está na fonte.`);
}

const avanco = (g) => hmtx.readUInt16BE(Math.min(g, metricas - 1) * 4);
const posicao = (g) => (longa ? loca.readUInt32BE(g * 4) : loca.readUInt16BE(g * 2) * 2);

function contornos(g) {
  const o = posicao(g);
  if (posicao(g + 1) === o) return [];
  const n = glyf.readInt16BE(o);
  if (n < 0) throw new Error(`O glifo ${g} é composto: este script só lê glifos simples.`);
  const fins = Array.from({ length: n }, (_, i) => glyf.readUInt16BE(o + 10 + i * 2));
  const total = fins.at(-1) + 1;
  let p = o + 10 + n * 2;
  p += 2 + glyf.readUInt16BE(p);
  const bandeiras = [];
  while (bandeiras.length < total) {
    const b = glyf[p++];
    bandeiras.push(b);
    if (b & 8) for (let r = glyf[p++]; r > 0; r--) bandeiras.push(b);
  }
  const ler = (curto, igual) => {
    let v = 0;
    return bandeiras.map((b) => {
      if (b & curto) v += b & igual ? glyf[p++] : -glyf[p++];
      else if (!(b & igual)) {
        v += glyf.readInt16BE(p);
        p += 2;
      }
      return v;
    });
  };
  const xs = ler(2, 16),
    ys = ler(4, 32);
  let inicio = 0;
  return fins.map((fim) => {
    const c = [];
    for (let i = inicio; i <= fim; i++) c.push({ x: xs[i], y: ys[i], dentro: !!(bandeiras[i] & 1) });
    inicio = fim + 1;
    return c;
  });
}

// Curvas quadráticas do TrueType: entre dois pontos de controlo seguidos há um ponto na curva, a meio.
function caminho(c, dx) {
  const pontos = [];
  c.forEach((q, i) => {
    const ant = c[(i - 1 + c.length) % c.length];
    if (!q.dentro && !ant.dentro) pontos.push({ x: (q.x + ant.x) / 2, y: (q.y + ant.y) / 2, dentro: true });
    pontos.push(q);
  });
  const k = pontos.findIndex((q) => q.dentro);
  const ordem = [...pontos.slice(k), ...pontos.slice(0, k)];
  const f = (q) => `${Math.round(q.x + dx)} ${Math.round(-q.y)}`;
  let d = `M${f(ordem[0])}`;
  for (let i = 1; i <= ordem.length; i++) {
    const q = ordem[i % ordem.length];
    if (q.dentro) d += `L${f(q)}`;
    else {
      d += `Q${f(q)} ${f(ordem[(i + 1) % ordem.length])}`;
      i++;
    }
  }
  return d + 'Z';
}

let x = 0,
  esquerda = Infinity,
  direita = 0,
  cima = 0,
  baixo = 0,
  d = '';
for (const ch of TEXTO) {
  const g = glifoDe(ch.codePointAt(0));
  const o = posicao(g);
  if (posicao(g + 1) > o) {
    esquerda = Math.min(esquerda, x + glyf.readInt16BE(o + 2));
    direita = Math.max(direita, x + glyf.readInt16BE(o + 6));
    cima = Math.max(cima, glyf.readInt16BE(o + 8));
    baixo = Math.min(baixo, glyf.readInt16BE(o + 4));
  }
  for (const c of contornos(g)) d += caminho(c, x);
  x += avanco(g);
}

writeFileSync(
  new URL('../src/lib/logotipo.ts', import.meta.url),
  `// Gerado por scripts/logotipo.mjs: «${TEXTO}» em Playfair Display 600.\n` +
    `export const caixa = '${esquerda} ${-cima} ${direita - esquerda} ${cima - baixo}';\nexport const contorno = '${d}';\n`,
);
console.log(`src/lib/logotipo.ts: ${d.length} caracteres, caixa ${direita - esquerda}×${cima - baixo}`);
