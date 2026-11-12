// Page of each demo, only opened inside the iframe of the articles (src/components/Demo.astro).
// It stays out of the sitemap (astro.config.ts) and of the search (it has no data-pagefind-body).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { demoPage } from '../../../lib/demos.js';

export const getStaticPaths = (async () =>
  (await getCollection('demos')).map((d) => ({
    params: { id: d.id },
    props: { code: d.data.code },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(demoPage(props.code), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
