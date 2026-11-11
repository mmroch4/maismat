// The demo rules for the panel too (preview in public/admin/index.html), without copying them.
import type { APIRoute } from 'astro';
import source from '../../lib/demos.js?raw';

export const GET: APIRoute = () =>
  new Response(source, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
