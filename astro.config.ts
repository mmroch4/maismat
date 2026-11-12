import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkFigures from './src/lib/remark-figures.ts';

export default defineConfig({
  // Provisional domain; change it here when the school has its own.
  site: 'https://maismat.miguelrocha.dev',
  integrations: [
    mdx(),
    // The print version repeats the issue's articles, and demos are only opened inside the articles.
    sitemap({ filter: (page) => !page.endsWith('/imprimir/') && !page.includes('/demonstracoes/') }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkFigures],
    rehypePlugins: [[rehypeKatex, { strict: false }]],
  },
});
