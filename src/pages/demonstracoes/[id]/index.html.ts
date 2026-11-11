// Página de cada demonstração, aberta só dentro do iframe dos artigos (src/components/Demonstracao.astro).
// Fica fora do sitemap (astro.config.mjs) e da pesquisa (não tem data-pagefind-body).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { pagina } from '../../../lib/demonstracoes.mjs';

export const getStaticPaths = (async () =>
  (await getCollection('demonstracoes')).map((d) => ({ params: { id: d.id }, props: { codigo: d.data.codigo } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(pagina(props.codigo), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
