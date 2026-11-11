// Página de cada demonstração, aberta só dentro do iframe dos artigos (src/components/Demonstracao.astro).
// Fica fora do sitemap (astro.config.mjs) e da pesquisa (não tem data-pagefind-body).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { demoPage } from '../../../lib/demos.js';

export const getStaticPaths = (async () =>
  (await getCollection('demonstracoes')).map((d) => ({
    params: { id: d.id },
    props: { codigo: d.data.codigo },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(demoPage(props.codigo), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
