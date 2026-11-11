// As regras das demonstrações também para o painel (pré-visualização em public/admin/index.html), sem as copiar.
import type { APIRoute } from 'astro';
import fonte from '../../lib/demonstracoes.mjs?raw';

export const GET: APIRoute = () => new Response(fonte, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
