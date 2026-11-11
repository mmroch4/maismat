// Datas de atualização dos artigos, a partir do histórico do git (usado no build e nas verificações).
import { execFileSync } from 'node:child_process';

// Os commits antes desta data são da conversão das edições em papel e não contam como atualizações.
// Mudar para o dia do lançamento, se for outro.
export const LANCAMENTO = '2026-11-12';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

let completo;
const historicoCompleto = () => {
  // Num clone parcial (shallow) as datas seriam todas a do último commit: mais vale não as dar.
  try { completo ??= git('rev-parse', '--is-shallow-repository') === 'false'; } catch { completo = false; }
  return completo;
};

/** Dia (AAAA-MM-DD) do último commit depois do lançamento que mexeu no ficheiro, ou undefined. @param {string} ficheiro */
export function ultimaAtualizacao(ficheiro) {
  if (!historicoCompleto()) return undefined;
  return git('log', '-1', '--format=%cs', `--since=${LANCAMENTO}T00:00:00Z`, '--', ficheiro) || undefined;
}
