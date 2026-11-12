import type { APIContext } from 'astro';

// Everything may be crawled. The panel and the 404 page are not blocked here: they have noindex, and a
// search engine only sees it if it can open the page. The sitemap address comes from `site` in astro.config.ts.
export function GET({ site }: APIContext) {
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
