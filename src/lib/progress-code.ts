// Code that carries a reader's challenge progress to another device: used by the challenge archive
// (src/pages/desafios.astro) and by scripts/verify.test.ts.
// Format: "MAT1-" + Crockford base32 of [4 bytes per id, deduplicated and sorted][CRC-16/CCITT of those bytes].
// When decoding, case, spaces, hyphens and line breaks are ignored, O reads as 0, and I and L read as 1.
// The error messages are shown to readers, so they are in Portuguese.

const PREFIX = 'MAT1-';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CHALLENGE_ID = /^desafio-[0-9a-f]{8}$/;

function crc16(bytes: number[]): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

export function encodeProgress(ids: Iterable<string>): string {
  const bytes: number[] = [];
  for (const id of [...new Set(ids)].sort()) {
    if (!CHALLENGE_ID.test(id)) throw new Error(`Id inválido: “${id}”.`);
    for (let i = 8; i < 16; i += 2) bytes.push(parseInt(id.slice(i, i + 2), 16));
  }
  const crc = crc16(bytes);
  bytes.push(crc >> 8, crc & 0xff);
  let code = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) code += ALPHABET[(buffer >> (bits -= 5)) & 31];
  }
  if (bits) code += ALPHABET[(buffer << (5 - bits)) & 31];
  return PREFIX + code;
}

export function decodeProgress(code: string): string[] {
  const text = code.toUpperCase().replace(/\s+/g, '');
  if (!text) throw new Error('Cola primeiro o teu código.');
  const version = text.match(/^MAT(\d+)-/);
  if (!version) throw new Error('Isto não parece um código do +MAT: devia começar por MAT1-.');
  if (version[1] !== '1')
    throw new Error(`Este código é de uma versão do +MAT que este site não conhece (MAT${version[1]}).`);
  const body = text.slice(version[0].length).replace(/-/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const invalid = body.match(/[^0-9A-HJKMNP-TV-Z]/);
  if (invalid) throw new Error(`O código tem um carácter que não pode ter (“${invalid[0]}”). Volta a copiá-lo.`);

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of body) {
    buffer = ((buffer << 5) | ALPHABET.indexOf(char)) & 0xfff;
    bits += 5;
    if (bits >= 8) bytes.push((buffer >> (bits -= 8)) & 0xff);
  }
  const incomplete = 'O código está incompleto ou foi alterado. Volta a copiá-lo inteiro.';
  if (bytes.length < 2 || (bytes.length - 2) % 4 || bits >= 5 || buffer & ((1 << bits) - 1))
    throw new Error(incomplete);
  const data = bytes.slice(0, -2);
  if (crc16(data) !== ((bytes.at(-2)! << 8) | bytes.at(-1)!)) throw new Error(incomplete);

  const ids: string[] = [];
  for (let i = 0; i < data.length; i += 4)
    ids.push(
      'desafio-' +
        data
          .slice(i, i + 4)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
    );
  return ids;
}

// QR code link: the code goes in the fragment (#progresso=…), which the browser never sends to the server.
// The fragment name is part of public URLs, so it stays in Portuguese.
const FRAGMENT = /^#?progresso=(.*)$/s;

/** @param origin e.g. "https://maismat.miguelrocha.dev" */
export const progressLink = (origin: string, ids: Iterable<string>) =>
  `${new URL('/desafios/', origin)}#progresso=${encodeProgress(ids)}`;

/** @returns the code still to be validated (with `decodeProgress`), or null if the fragment has none */
export function codeFromLink(hash: string): string | null {
  const match = hash.match(FRAGMENT);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
