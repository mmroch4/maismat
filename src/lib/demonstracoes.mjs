// Regras das demonstrações feitas pelas professoras (src/content/demonstracoes): usadas pela página
// de cada demonstração e pelas verificações. A outra metade da proteção está em public/_headers.

// Bibliotecas que uma demonstração pode carregar, com a versão fixa no caminho.
export const BIBLIOTECAS = [
  'https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/',
  'https://cdn.jsdelivr.net/npm/jsxgraph@1.14.2/distrib/',
];

export const TAMANHO_MAXIMO = 100_000;

export const CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' ${BIBLIOTECAS.join(' ')}`,
  `style-src 'unsafe-inline' ${BIBLIOTECAS.join(' ')}`,
  'img-src data: blob:',
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

// Avisa a página do artigo da altura do conteúdo, para o iframe não ter barra de deslocamento.
const ALTURA = `<script>new ResizeObserver(() => parent.postMessage({ maismat: 'altura', altura: Math.ceil(document.documentElement.getBoundingClientRect().height) }, '*')).observe(document.documentElement);</script>`;

// O ficheiro HTML da professora, com a CSP no início do <head> (antes de qualquer script) e o aviso da altura no fim.
export function pagina(codigo) {
  const cabeca = `\n<meta http-equiv="Content-Security-Policy" content="${CSP}">\n<meta name="robots" content="noindex">`;
  const html = /<head\b[^>]*>/i.test(codigo)
    ? codigo.replace(/<head\b[^>]*>/i, (h) => h + cabeca)
    : `<!doctype html>\n<html lang="pt-PT">\n<head>${cabeca}\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${codigo}\n</body>\n</html>\n`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${ALTURA}\n</body>`) : html + ALTURA;
}
