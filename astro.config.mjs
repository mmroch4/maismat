// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkFiguras from './src/lib/remark-figuras.mjs';

export default defineConfig({
  // Domínio provisório; alterar aqui quando a escola tiver o seu.
  site: 'https://maismat.miguelrocha.dev',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath, remarkFiguras],
    rehypePlugins: [[rehypeKatex, { strict: false }]],
  },
});
