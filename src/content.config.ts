import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MAX_DEMO_HEIGHT, MIN_DEMO_HEIGHT } from './lib/demos.js';
import { SECTION_IDS } from './lib/sections';

// Validation messages are shown to the teachers when the build fails, so they stay in Portuguese.

const quote = z.object({ text: z.string(), author: z.string() });

const issues = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/issues' }),
  schema: ({ image }) =>
    z.object({
      /** Year of the newspaper (1, 2, 3, …), not the calendar year */
      year: z.number().int(),
      /** Number of the issue within that year */
      number: z.number().int(),
      date: z.coerce.date(),
      editors: z.array(z.string()),
      cover: image().optional(),
      // nullish: issues saved before output.omit_empty_optional_fields have `quote: null`
      quote: quote.nullish(),
      /** Original PDF, in /public/pdf */
      pdf: z.string().optional(),
      /** false for issues only available as a PDF (archive not yet converted) */
      converted: z.boolean().default(true),
      /** Issue being prepared: it and its articles stay off the site */
      draft: z.boolean().default(false),
    }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    issue: reference('issues'),
    section: z.enum(SECTION_IDS),
    order: z.number(),
    authors: z.array(z.string()).optional(),
    summary: z.string().optional(),
    level: z.string().optional(),
    quote: quote.nullish(),
  }),
});

// Animations and simulations in a single HTML file; each one becomes the page /demonstracoes/<id>/.
const required = (field: string) =>
  z
    .string({ message: `Falta ${field} da demonstração.` })
    .trim()
    .min(1, `Falta ${field} da demonstração.`);
const demos = defineCollection({
  loader: glob({ pattern: '*.yml', base: './src/content/demos' }),
  schema: z.object({
    title: required('o título'),
    description: required('a descrição'),
    height: z.number().int().min(MIN_DEMO_HEIGHT).max(MAX_DEMO_HEIGHT).default(400),
    code: required('o código'),
  }),
});

export const collections = { issues, articles, demos };
