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
      // nullish: as edições gravadas antes de output.omit_empty_optional_fields têm `citacao: null`
      citacao: z.object({ texto: z.string(), autor: z.string() }).nullish(),
      // PDF original, em /public/pdf
      pdf: z.string().optional(),
      // Edições ainda só disponíveis em PDF (arquivo por converter)
      convertida: z.boolean().default(true),
      // Edição em preparação: ela e os seus artigos ficam fora do site
      rascunho: z.boolean().default(false),
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
    citacao: z.object({ texto: z.string(), autor: z.string() }).nullish(),
  }),
});

// Animações e simulações num só ficheiro HTML; cada uma vira a página /demonstracoes/<id>/.
const obrigatorio = (campo: string) =>
  z
    .string({ message: `Falta ${campo} da demonstração.` })
    .trim()
    .min(1, `Falta ${campo} da demonstração.`);
const demonstracoes = defineCollection({
  loader: glob({ pattern: '*.yml', base: './src/content/demonstracoes' }),
  schema: z.object({
    titulo: obrigatorio('o título'),
    descricao: obrigatorio('a descrição'),
    altura: z.number().int().min(150).max(1200).default(400),
    codigo: obrigatorio('o código'),
  }),
});

export const collections = { edicoes, artigos, demonstracoes };
