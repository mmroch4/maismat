# To do

## Get the editing panel working

- [x] Push the `main` branch (the panel reads from and writes to it).
- [x] Confirm the `base_url` in `src/pages/admin/config.json.ts` (the worker's address). The `repo` (`mmroch4/maismat`) and `branch` (`main`) are already right.
- [x] Deploy the [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) worker on Cloudflare Workers, following the project's README.
- [x] Register a GitHub App (not an OAuth App: the authenticator's README recommends it, because it only has access to this repository). The «Redirect URI» is `https://<worker>/callback`; permissions: Contents and Pull requests set to «Read and write». Install it only on `mmroch4/maismat`. Then set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (as a secret) and `ALLOWED_DOMAINS=maismat.miguelrocha.dev` on the worker.
- [x] On Cloudflare Pages: connect the repository, with the command `npm run build`, the `dist` folder and `main` as the production branch. The Node version comes from `.nvmrc` (no `NODE_VERSION` needed).
- [ ] Invite Rosa and Carla as collaborators in Settings → Collaborators, once they have GitHub accounts.
- [x] Test with the real login: create a draft issue and an article in it, confirm it does not show on the site, turn the draft off and confirm it shows.
- [ ] With the real login, test demos and GeoGebra in the panel (the docs say it works, but it could not be tested without a login):
  - in **Demonstrações → Novo**, the «Código» field shows the code editor and saves the `.yml` file with the HTML exactly as pasted;
  - the preview (eye icon) runs the demo. If it stays blank, Sveltia's preview frame does not allow scripts: remove the `registerPreviewTemplate` from `public/admin/index.html` (the code is shown instead);
  - the new identifier has no accents (for example `cicloide-…`), because of the `slug` in `config.json.ts`;
  - in **Inserir → Demonstração**, the list shows the demos by title (`relation` field). If it does not, switch to a `select` generated at build time in `config.json.ts` (new demos would only appear in the list after the next deploy);
  - **Inserir → Applet GeoGebra** rejects a link that is not an applet and saves `<GeoGebra url="…" title="…" height={500} />`.
- [x] With the real login, create an issue without a quote or PDF: the saved file must not have `quote` or `pdf` lines (`output.omit_empty_optional_fields` in `config.json.ts`). If it does, the build still passes (the schema accepts `null` and the check ignores `pdf: ''`).
- [ ] With the real login, in an issue, upload a PDF over 25 MB in the «PDF original» field: the panel should reject it before saving (`max_file_size` in `config.json.ts`). If it accepts it, the build still fails on the 25 MiB check, but the teacher only finds out after saving.

## After the English refactor is merged

- [ ] With the real login, open an existing article and a challenge in the panel, change nothing, and save: the commit should not change the file. Then insert each block (Desafio, Galeria, Nota, Jogo ou animação, Demonstração, Applet GeoGebra) and check the preview.
- [ ] Confirm that the panel's commits still read «Criar/Atualizar/Apagar Edição …» (the collection names changed to `issues`, `articles` and `demos`; the labels did not).

## On launch day

- [ ] Set `LAUNCH_DATE` (`src/lib/git.ts`) to the real launch day. Commits before that date do not count as article updates (`dateModified`).

## After the first deploy

- [x] An address that does not exist returns 404 (not 200), with the +MAT page:
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' https://maismat.miguelrocha.dev/nao-existe/
  ```
- [x] The security headers arrive (six lines should show):
  ```bash
  curl -sI https://maismat.miguelrocha.dev/ | grep -iE "x-content|referrer|x-frame|content-security|permissions|strict-transport"
  ```
- [x] Files in `/_astro/` are cached for a year (`max-age=31536000, immutable`):
  ```bash
  curl -sI "https://maismat.miguelrocha.dev$(curl -s https://maismat.miguelrocha.dev/ | grep -o '/_astro/[^"]*\.css' | head -1)" | grep -i cache-control
  ```
- [x] `robots.txt` points to the sitemap and `/admin/config.json` has the right `site_url`:
  ```bash
  curl -s https://maismat.miguelrocha.dev/robots.txt
  curl -s https://maismat.miguelrocha.dev/admin/config.json | grep -o '"site_url":"[^"]*"'
  ```
- [ ] `/sitemap.xml` redirects (301) to `/sitemap-index.xml` (`public/_redirects`):
  ```bash
  curl -sI https://maismat.miguelrocha.dev/sitemap.xml | grep -iE "^HTTP|^location"
  ```
- [ ] With the new headers, the panel (`/admin/`) opens, lets you log in and shows formulas in the preview; search (`/pesquisa/`) returns results; on the challenges page, the button that copies the progress code works.
- [x] Demos are isolated even when opened outside the article (`astro preview` does not apply `_headers`, so this only shows after deploying). The CSP of `/*` and that of `/demonstracoes/*` should appear joined by a comma, plus the `X-Robots-Tag`:
  ```bash
  curl -sI https://maismat.miguelrocha.dev/demonstracoes/cicloide/ | grep -iE "content-security|x-robots"
  ```
- [ ] In the cycloid article (`/edicoes/ano3-edicao3/05-cicloide/`), the demo shows and animates, on desktop and on a phone (`frame-ancestors 'self'` must not block it). Open `/demonstracoes/cicloide/` directly: it works, and in the console `self.origin` is `"null"`.
- [ ] In an article with a GeoGebra applet: before the click there are no requests to geogebra.org (Network tab of the developer tools); after the click the applet shows and the fullscreen button works.
- [ ] Paste an article link into WhatsApp or Teams: the issue cover, the title and the summary appear.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) on the home page, an issue and an article with formulas, on mobile. If LCP is over 2.5 s or CLS over 0.1, look at what the report points to. The Chrome console should show no «preloaded but not used» font warnings (with the tab visible).
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) on an article and an issue: the article shows as *Article*, with no errors, and with the logo in *publisher*. Warnings about optional fields can stay.
- [ ] [Google Search Console](https://search.google.com/search-console):
  - add the site (URL prefix, `https://maismat.miguelrocha.dev/`);
  - under *Sitemaps*, submit `sitemap-index.xml`;
  - under *Settings → robots.txt*, confirm it was read without errors;
  - under *URL Inspection*, with an article: the canonical chosen by Google is the one the site declares;
  - a few days later, under *Pages*, check for pages excluded by mistake (only the 404, the panel and the print versions may be left out).

## After deploying the «Caderno» redesign

- [ ] On a real phone (iPhone and Android), in light and dark:
  - the bottom bar does not cover the end of the pages or the footer, and on iPhone it sits above the system bar (`safe-area-inset-bottom`);
  - «Mais» opens the sheet, which closes with «Fechar», by tapping outside it and by choosing a link; «Levar o progresso dos desafios» opens the panel at `/desafios/#levar`;
  - in search, the row of sections scrolls sideways and the chosen section is in view.
- [ ] The five challenge states, with a real correct answer (in the preview only the «correct» state of an already solved challenge was seen): green background, «✓ Desafio N» pill and the solution open in a white block. With a wrong answer, «✕ Ainda não…».
- [ ] The cycloid demo shows inside the new frame (the preview blocks iframes, so only the empty frame was seen).
- [ ] Keyboard only, from the home page to answering a challenge: the 3 px focus ring is always visible, also over the blue buttons and in the pill bar.
- [ ] With «Reduce motion» turned on in the system, the progress ring shows already full and the cards do not slide up.
- [ ] Print an issue: no band, bars, «Mais» sheet or footer.
- [ ] In PageSpeed Insights, Playfair no longer shows in the requests and the two preloaded fonts (Inter and Source Serif 4) are used.

## After the first issue edited in the panel

- [ ] In the source of the edited (already published) article, look for `dateModified` with the edit date. If it is not there, Cloudflare Pages is doing a partial (shallow) clone of the repository and the date is left out; the rest of the site is not affected.

## When there is a final domain

- [ ] Change `site` in `astro.config.ts`. The rest of the site and the checks follow it.
- [ ] Update the address by hand in `docs/guia-professoras.md` and in this file, and the panel worker's `ALLOWED_DOMAINS`.
- [ ] Redirect the provisional domain to the new one (301) and, in Search Console, add the new one and use *Change of address* on the old one.
