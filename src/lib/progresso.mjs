// Código para levar o progresso dos desafios para outro computador: usado no arquivo (desafios.astro) e em scripts/verificar.test.mjs.
// Formato: "MAT1-" + base32 de Crockford de [4 bytes por id, sem repetições e ordenados][CRC-16/CCITT desses bytes].
// Na leitura, maiúsculas, espaços, hífenes e quebras de linha não contam, e O vale 0, I e L valem 1.

const PREFIXO = 'MAT1-';
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const ID = /^desafio-[0-9a-f]{8}$/;

/** @param {number[]} bytes */
function crc16(bytes) {
  let c = 0xffff;
  for (const b of bytes) {
    c ^= b << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c;
}

/** @param {Iterable<string>} ids */
export function codificar(ids) {
  const bytes = [];
  for (const id of [...new Set(ids)].sort()) {
    if (!ID.test(id)) throw new Error(`Id inválido: “${id}”.`);
    for (let i = 8; i < 16; i += 2) bytes.push(parseInt(id.slice(i, i + 2), 16));
  }
  const c = crc16(bytes);
  bytes.push(c >> 8, c & 0xff);
  let s = '';
  let v = 0;
  let n = 0;
  for (const b of bytes) {
    v = ((v << 8) | b) & 0xfff;
    n += 8;
    while (n >= 5) s += ALFABETO[(v >> (n -= 5)) & 31];
  }
  if (n) s += ALFABETO[(v << (5 - n)) & 31];
  return PREFIXO + s;
}

/** @param {string} codigo @returns {string[]} */
export function descodificar(codigo) {
  const t = codigo.toUpperCase().replace(/\s+/g, '');
  if (!t) throw new Error('Cola primeiro o teu código.');
  const versao = t.match(/^MAT(\d+)-/);
  if (!versao) throw new Error('Isto não parece um código do +MAT: devia começar por MAT1-.');
  if (versao[1] !== '1')
    throw new Error(`Este código é de uma versão do +MAT que este site não conhece (MAT${versao[1]}).`);
  const corpo = t.slice(versao[0].length).replace(/-/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const errado = corpo.match(/[^0-9A-HJKMNP-TV-Z]/);
  if (errado) throw new Error(`O código tem um carácter que não pode ter (“${errado[0]}”). Volta a copiá-lo.`);

  const bytes = [];
  let v = 0;
  let n = 0;
  for (const ch of corpo) {
    v = ((v << 5) | ALFABETO.indexOf(ch)) & 0xfff;
    n += 5;
    if (n >= 8) bytes.push((v >> (n -= 8)) & 0xff);
  }
  const incompleto = 'O código está incompleto ou foi alterado. Volta a copiá-lo inteiro.';
  if (bytes.length < 2 || (bytes.length - 2) % 4 || n >= 5 || v & ((1 << n) - 1)) throw new Error(incompleto);
  const dados = bytes.slice(0, -2);
  if (crc16(dados) !== ((bytes.at(-2) << 8) | bytes.at(-1))) throw new Error(incompleto);

  const ids = [];
  for (let i = 0; i < dados.length; i += 4)
    ids.push(
      'desafio-' +
        dados
          .slice(i, i + 4)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
    );
  return ids;
}

// Ligação do QR: o código vai no fragmento (#progresso=…), que o browser nunca envia ao servidor.
const FRAGMENTO = /^#?progresso=(.*)$/s;

/** @param {string} origem ex.: "https://maismat.miguelrocha.dev" @param {Iterable<string>} ids */
export const ligacaoProgresso = (origem, ids) => `${new URL('/desafios/', origem)}#progresso=${codificar(ids)}`;

/** @param {string} hash @returns {string | null} o código por validar (com `descodificar`), ou null se o fragmento não o tiver */
export function codigoDaLigacao(hash) {
  const m = hash.match(FRAGMENTO);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
