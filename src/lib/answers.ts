// Canonical form of an answer before hashing: used at build time (Challenge component), in the browser
// and in scripts/verify.test.ts. Accents, case and spaces are ignored and a decimal comma counts as a
// point; with `decimals`, numbers are rounded.
export function normalizeAnswer(answer: string, decimals?: number): string {
  const text = answer
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
  if (decimals === undefined) return text;
  const n = parseFloat(text);
  return Number.isNaN(n) ? text : n.toFixed(decimals);
}
