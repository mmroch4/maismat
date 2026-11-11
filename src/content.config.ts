import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { SECCAO_IDS } from './lib/seccoes';

const edicoes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/edicoes' }),
  schema: ({ image }) =>
    z.object({
      ano: z.number().int(),
      numero: z.number().int(),
      data: z.coerce.date(),
      direcao: z.array(z.string()),
      capa: image().optional(),
      citacao: z.object({ texto: z.string(), autor: z.string() }).optional(),
      // PDF original, em /public/pdf
      pdf: z.string().optional(),
      // Edições ainda só disponíveis em PDF (arquivo por converter)
      convertida: z.boolean().default(true),
    }),
});

const artigos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/artigos' }),
  schema: z.object({
    titulo: z.string(),
    edicao: reference('edicoes'),
    seccao: z.enum(SECCAO_IDS),
    ordem: z.number(),
    autores: z.array(z.string()).optional(),
    resumo: z.string().optional(),
    nivel: z.string().optional(),
    citacao: z.object({ texto: z.string(), autor: z.string() }).optional(),
  }),
});

export const collections = { edicoes, artigos };
