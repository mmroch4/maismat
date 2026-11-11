import type { APIContext } from 'astro';

// Tudo pode ser lido. O painel e a 404 não são bloqueados aqui: têm noindex, e um motor de busca
// só o vê se puder abrir a página. O endereço do sitemap vem do `site` em astro.config.mjs.
export function GET({ site }: APIContext) {
  const texto = ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''].join(
    '\n',
  );
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
