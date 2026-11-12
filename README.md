# +MAT — digital edition

Digital edition of **+MAT, Jornal de Matemática**, the mathematics newspaper of Agrupamento de Escolas Domingos Sequeira
(edited by Rosa Bértolo and Carla Nunes).

Built by **Miguel Rocha** and offered to the school free of charge, provided that the authorship and credits
(footer and the “Sobre” page) stay visible.

The site is written in Portuguese for its readers; the code, comments and developer docs are in English.
The guide for the teachers, [docs/guia-professoras.md](docs/guia-professoras.md), stays in Portuguese.

## Running locally

Requires Node 22.18 or newer (the version used in production is in `.nvmrc`).

```bash
npm install
npm run dev
```

| Script                  | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`           | Development server.                                                                  |
| `npm run build`         | Builds the site into `dist/`, indexes it with Pagefind and runs `npm run verify`.    |
| `npm run verify`        | Post-build checks in `scripts/verify.test.ts` (`node --test`).                       |
| `npm run check`         | Type-checks `.ts` and `.astro` files (`astro check`, TypeScript strict).             |
| `npm run lint`          | ESLint.                                                                              |
| `npm run format`        | Prettier (`npm run format:check` only checks).                                       |
| `npm run generate:logo` | Regenerates `src/lib/logo.ts` from the Playfair Display font (`scripts/generate-logo.ts`).        |

The checks in `verify` cover what the editing panel cannot prevent: challenge ids, answers that the site accepts and
that are among the options, no answers in the challenge archive, no published draft issues, broken links, isolated
demos, and so on. If one fails, the build fails and Cloudflare Pages keeps the previous version of the site. The
messages name the panel's (Portuguese) labels so they can be passed on to the teachers as they are.

CI (`.github/workflows/ci.yml`) runs format check, lint, type check and build on every pull request.

## Stack

Astro + MDX + KaTeX + Pagefind, deployed on Cloudflare Pages. The editing panel is Sveltia CMS at `/admin/`, with
GitHub as the backend. TypeScript files run directly in Node (type stripping), so scripts need no build step.

## Structure

- `src/content/issues/` — one file per issue (date, cover, original PDF, `converted: false` while only the PDF exists,
  `draft: true` while it is being prepared).
- `src/content/articles/<issue>/` — one `.mdx` file per article, with its images in `img/`.
- `src/content/demos/` — animations and simulations, each a single HTML file inside a `.yml`; they are served
  sandboxed at `/demonstracoes/<id>/`.
- `src/content.config.ts` — the content schema. `src/pages/admin/config.json.ts` mirrors it for the panel.
- `src/lib/` — shared logic: `issues.ts` (published issues and articles), `challenges.ts` (challenge archive),
  `answers.ts`, `progress-code.ts` and `storage.ts` (challenge progress), `structured-data.ts`, `git.ts`
  (`LAUNCH_DATE` and last-modified dates).
- `src/components/` — `Challenge.astro` (challenge with answer checking: only hashes reach the HTML), the interactive
  pieces (`Skyscrapers`, `PascalTriangle`, `MontyHall`, `Collatz`, `GeoGebra`, `Demo`) and the site's UI.
- `src/pages/` — routes. Public URLs are in Portuguese (`/edicoes/`, `/seccoes/`, `/desafios/`, `/pesquisa/`,
  `/sobre/`) and must not change.
- `public/admin/` — the panel: `index.html`, editor blocks in `components.js` and their preview styles in `preview.css`.
- `public/pdf/` — original PDFs.

Challenge progress is stored in `localStorage` under `maismat:challenge:<id>`; the theme under `maismat:theme`.

## Writing articles

The teachers write in the panel at `/admin/`; see [docs/guia-professoras.md](docs/guia-professoras.md).
The components in `src/lib/mdx-components.ts` are available in every article without an `import`.

- LaTeX formulas: `$x^2$` inline, `$$ ... $$` on their own line.
- Image with a caption: `![description](./img/photo.jpg "Caption")`.
- Challenge:

  ```mdx
  <Challenge id="desafio-1a2b3c4d" number={1} title="..." answer="31|trinta e um">
  Statement...
  <div slot="solution">Explanation...</div>
  </Challenge>
  ```

Keep the MDX in the shape the panel writes (see `public/admin/components.js`): for demos and GeoGebra applets the build rejects hand-written
blocks that the panel would not recognise.

The pending work is tracked in [docs/todo.md](docs/todo.md).
