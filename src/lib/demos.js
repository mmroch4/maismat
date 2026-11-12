// @ts-check
// Rules for the demos the teachers make (src/content/demos): used by each demo's page, by the
// panel's preview (served as-is at /admin/demos.js, so this file stays plain JavaScript) and by the
// post-build checks. The other half of the protection is in public/_headers.

/** Libraries a demo may load, with the version pinned in the path. */
export const ALLOWED_LIBRARIES = [
  'https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/',
  'https://cdn.jsdelivr.net/npm/jsxgraph@1.14.2/distrib/',
];

export const MAX_SIZE = 100_000;

/** Bounds of a demo's height in px, both for the panel field and for the height the demo asks for. */
export const MIN_DEMO_HEIGHT = 150;
export const MAX_DEMO_HEIGHT = 1200;

/** `maismat` value of the message a demo sends with its content height. */
export const DEMO_HEIGHT_MESSAGE = 'height';

export const CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' ${ALLOWED_LIBRARIES.join(' ')}`,
  `style-src 'unsafe-inline' ${ALLOWED_LIBRARIES.join(' ')}`,
  'img-src data: blob:',
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

// Tells the article page the content height, so the iframe has no scroll bar.
const HEIGHT_REPORTER = `<script>new ResizeObserver(() => parent.postMessage({ maismat: '${DEMO_HEIGHT_MESSAGE}', height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, '*')).observe(document.documentElement);</script>`;

/**
 * The teacher's HTML file, with the CSP at the start of <head> (before any script) and the height reporter at the end.
 * @param {string} code
 */
export function demoPage(code) {
  const head = `\n<meta http-equiv="Content-Security-Policy" content="${CSP}">\n<meta name="robots" content="noindex">`;
  const html = /<head\b[^>]*>/i.test(code)
    ? code.replace(/<head\b[^>]*>/i, (tag) => tag + head)
    : `<!doctype html>\n<html lang="pt-PT">\n<head>${head}\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${code}\n</body>\n</html>\n`;
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${HEIGHT_REPORTER}\n</body>`)
    : html + HEIGHT_REPORTER;
}
