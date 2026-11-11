// Forma canónica de uma resposta, antes do hash: usada no build (Desafio.astro), no browser e em scripts/verificar.test.mjs.
// Acentos, maiúsculas e espaços não contam e a vírgula decimal vale ponto; com `casas`, os números são arredondados.

/** @param {string} s @param {number} [casas] */
export function normalizar(s, casas) {
  const t = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/,/g, '.').replace(/\s+/g, '');
  if (casas === undefined) return t;
  const n = parseFloat(t);
  return Number.isNaN(n) ? t : n.toFixed(casas);
}
