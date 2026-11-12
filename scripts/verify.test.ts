// Post-build checks (`npm run build` runs them at the end; on their own: `npm run verify`).
// They catch the mistakes the editing panel cannot prevent: impossible answers, repeated ids, visible answers,
// published drafts, broken links, and so on. Messages name the panel's (Portuguese) labels so that the fix can be
// passed on to the teachers as is.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import config from '../astro.config.ts';
import {
  appletGeoGebra as geogebraBlock,
  desafio as challengeBlock,
  demonstracao as demoBlock,
  geogebra as geogebraUrls,
} from '../public/admin/componentes.js';
import { normalizeAnswer } from '../src/lib/answers.ts';
import { ALLOWED_LIBRARIES, CSP, MAX_SIZE } from '../src/lib/demos.js';
import { LAUNCH_DATE, lastUpdated } from '../src/lib/git.ts';
import { codeFromLink, decodeProgress, encodeProgress, progressLink } from '../src/lib/progress-code.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
// The domain is set only in astro.config.ts.
const site = new URL(config.site!);
const read = (path: string) => readFileSync(root + path, 'utf8');
const exists = (path: string) => existsSync(root + path);
const listFiles = (dir: string) => readdirSync(root + dir, { recursive: true, encoding: 'utf8' });

type Frontmatter = Record<string, string>;
const frontmatter = (text: string): Frontmatter =>
  Object.fromEntries(
    [...(text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^(\w+):[ \t]*(.*)$/gm)].map(([, key, value]) => [
      key,
      value.trim(),
    ]),
  );

const issues: (Frontmatter & { id: string })[] = readdirSync(root + 'src/content/edicoes')
  .filter((file) => file.endsWith('.md'))
  .map((file) => ({ id: file.replace(/\.md$/, ''), ...frontmatter(read(`src/content/edicoes/${file}`)) }));
const drafts = new Set(issues.filter((issue) => issue.rascunho === 'true').map((issue) => issue.id));

// Every challenge, including those of draft issues (so that mistakes show up before publishing).
type Challenge = ReturnType<typeof challengeBlock.fromBlock> & {
  answers: string[];
  file: string;
  url: string;
  published: boolean;
};
const challengePattern = new RegExp(challengeBlock.pattern.source, 'gm');
const challenges: Challenge[] = listFiles('src/content/artigos')
  .filter((file) => /\.mdx?$/.test(file))
  .flatMap((file) => {
    const text = read(`src/content/artigos/${file}`);
    const { edicao: issueId } = frontmatter(text);
    const url = `/edicoes/${issueId}/${file
      .split('/')
      .pop()!
      .replace(/\.mdx?$/, '')}/`;
    return [...text.matchAll(challengePattern)].map((match) => {
      const challenge = challengeBlock.fromBlock(match);
      const answers = challenge.resposta ? challenge.resposta.split('|') : [];
      return { ...challenge, answers, file, url, published: !drafts.has(issueId) };
    });
  });
const publishedChallenges = challenges.filter((challenge) => challenge.published);
const describe = (challenge: Challenge) => `“${challenge.titulo}” (${challenge.file})`;

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const decodeEntities = (html: string) =>
  html.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (entity, hex, dec, name) =>
    hex
      ? String.fromCodePoint(parseInt(hex, 16))
      : dec
        ? String.fromCodePoint(Number(dec))
        : (ENTITIES[name] ?? entity),
  );
const textOf = (html: string) =>
  decodeEntities(html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, ' '));
const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
const containsWord = (text: string, word: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(text);
const safeDecodeUri = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};
const readPagefindFragments = () => {
  const dir = 'dist/pagefind/fragment';
  assert.ok(exists(dir), 'The search index is missing: Pagefind did not run over dist.');
  return readdirSync(root + dir).map(
    (file) =>
      JSON.parse(
        gunzipSync(readFileSync(`${root}${dir}/${file}`))
          .toString('utf8')
          .replace(/^pagefind_dcd/, ''),
      ) as {
        url: string;
        content: string;
        filters: Record<string, string[] | undefined>;
        meta: Record<string, string>;
      },
  );
};

let archive: string;
before(() => {
  assert.ok(exists('dist/desafios/index.html'), 'The built site is missing: run `npm run build` first.');
  archive = read('dist/desafios/index.html');
});

test('every challenge has an id, and only republished ones share it', () => {
  const byId = new Map<string, Challenge>();
  for (const challenge of challenges) {
    assert.match(
      challenge.id,
      /^desafio-[0-9a-f]{8}$/,
      `${describe(challenge)} has no valid id. Open it in the panel and save it.`,
    );
    const other = byId.get(challenge.id);
    assert.ok(
      !other || other.titulo === challenge.titulo,
      `${describe(other ?? challenge)} and ${describe(challenge)} share the same id. If they are different problems, clear the «Identificador» of one of them in the panel.`,
    );
    byId.set(challenge.id, challenge);
  }
});

test('the answers can be given on the site', () => {
  for (const challenge of challenges) {
    if (challenge.opcoes.length && challenge.answers.length) {
      const options = challenge.opcoes.map((option: string) => normalizeAnswer(option, challenge.casas));
      assert.ok(
        challenge.answers.some((answer) => options.includes(normalizeAnswer(answer, challenge.casas))),
        `${describe(challenge)}: the answer “${challenge.resposta}” is none of the options (${challenge.opcoes.join(' / ')}).`,
      );
    }
    if (challenge.casas !== undefined)
      for (const answer of challenge.answers)
        assert.ok(
          !Number.isNaN(parseFloat(normalizeAnswer(answer))),
          `${describe(challenge)}: it has «Casas decimais» but the answer “${answer}” is not a number.`,
        );
  }
});

test('every published challenge accepts its answers in the article', () => {
  for (const challenge of publishedChallenges.filter((challenge) => challenge.answers.length)) {
    const html = read(`dist${challenge.url}index.html`);
    const hashes = html.match(new RegExp(`id="${challenge.id}" data-hashes="([0-9a-f,]*)"`))?.[1].split(',');
    assert.ok(hashes, `${describe(challenge)}: the challenge was not found in dist${challenge.url}.`);
    for (const answer of challenge.answers) {
      const hash = createHash('sha256')
        .update(challenge.id + normalizeAnswer(answer, challenge.casas))
        .digest('hex');
      assert.ok(hashes.includes(hash), `${describe(challenge)}: the site would not accept the answer “${answer}”.`);
    }
  }
});

test('the archive lists every published challenge and links to each one', () => {
  const links = [...archive.matchAll(/<h3[^>]*><a href="([^"#]+)#(desafio-[0-9a-f]{8})"/g)].map(
    ([, url, id]) => `${url}#${id}`,
  );
  assert.deepEqual(
    links.toSorted(),
    publishedChallenges.map((challenge) => `${challenge.url}#${challenge.id}`).toSorted(),
  );
  for (const challenge of publishedChallenges)
    assert.ok(
      read(`dist${challenge.url}index.html`).includes(`id="${challenge.id}"`),
      `${describe(challenge)}: the anchor #${challenge.id} does not exist in the article.`,
    );
});

test('the archive does not reveal answers', () => {
  assert.ok(!/data-hashes|type="radio"|class="[^"]*resposta/.test(archive), 'The archive has hashes or answer forms.');
  const cards = [...archive.matchAll(/<li class="desafio"[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
  for (const challenge of publishedChallenges) {
    const source = simplify(`${challenge.titulo} ${challenge.enunciado}`);
    for (const [, , html] of cards.filter(([, id]) => id === challenge.id)) {
      // Only the title and the excerpt come from the article; an answer shown there must come from the statement itself.
      const visible = simplify(
        textOf([...html.matchAll(/<h3[\s\S]*?<\/h3>|<p class="excerto[\s\S]*?<\/p>/g)].join(' ')),
      );
      for (const answer of challenge.answers.map(simplify))
        assert.ok(
          !containsWord(visible, answer) || containsWord(source, answer),
          `The card of ${describe(challenge)} shows the answer “${answer}”.`,
        );
    }
  }
});

test('draft issues do not appear on the site', () => {
  const sitemap = exists('dist/sitemap-0.xml') ? read('dist/sitemap-0.xml') : '';
  for (const id of drafts) {
    assert.ok(!exists(`dist/edicoes/${id}`), `The draft issue ${id} was published.`);
    assert.ok(!sitemap.includes(`/edicoes/${id}/`), `The draft issue ${id} is in the sitemap.`);
    assert.ok(!archive.includes(`/edicoes/${id}/`), `The challenge archive has challenges from the draft issue ${id}.`);
  }
});

test('the progress code round-trips the ids and rejects damaged codes', () => {
  const ids = [...new Set(challenges.map((challenge) => challenge.id))].sort();
  for (const list of [[], ids.slice(0, 2), ids]) assert.deepEqual(decodeProgress(encodeProgress(list)), list);
  const code = encodeProgress(ids.slice(0, 10));
  assert.deepEqual(
    decodeProgress(` ${code.toLowerCase().replace(/.{20}/g, '$&\n')} `),
    ids.slice(0, 10),
    'Lower case and line breaks should be accepted.',
  );

  for (const empty of ['', '  \n ']) assert.throws(() => decodeProgress(empty), /Cola primeiro/);
  assert.throws(() => decodeProgress('MAT2-' + code.slice(5)), /versão do \+MAT que este site não conhece/);
  assert.throws(() => decodeProgress(code.slice(5)), /devia começar por MAT1-/);
  assert.throws(() => decodeProgress(code + 'U'), /carácter que não pode ter/);
  assert.throws(() => encodeProgress(['desafio-1234567']), /Id inválido/);
  assert.throws(() => encodeProgress(['maismat:desafio-12345678']), /Id inválido/);
  assert.throws(() => encodeProgress(['desafio-1234567G']), /Id inválido/);

  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  for (let i = 5; i < code.length; i++) {
    assert.throws(
      () => decodeProgress(code.slice(0, i)),
      /incompleto/,
      `The code cut at ${i} characters was accepted.`,
    );
    for (const char of alphabet.replace(code[i], ''))
      assert.throws(
        () => decodeProgress(code.slice(0, i) + char + code.slice(i + 1)),
        /incompleto/,
        `Replacing character ${i} with ${char} was not detected.`,
      );
  }
});

test('rss.xml has every published issue, newest first, and its links exist', () => {
  assert.ok(exists('dist/rss.xml'), 'dist/rss.xml is missing.');
  const items = [...read('dist/rss.xml').matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    link: item.match(/<link>([^<]+)<\/link>/)?.[1] ?? '',
    date: new Date(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? NaN),
  }));
  const ids = items.map((item) => item.link.match(/\/edicoes\/([^/]+)\/$/)?.[1]);
  assert.deepEqual(
    ids.toSorted(),
    issues
      .filter((issue) => !drafts.has(issue.id))
      .map((issue) => issue.id)
      .toSorted(),
  );
  for (const id of drafts) assert.ok(!ids.includes(id), `The draft issue ${id} is in rss.xml.`);
  for (let i = 1; i < items.length; i++)
    assert.ok(items[i - 1].date >= items[i].date, 'rss.xml is not ordered from the newest issue to the oldest.');
  for (const { link } of items)
    assert.ok(exists(`dist${new URL(link).pathname}index.html`), `rss.xml links to ${link}, which does not exist.`);
});

test('the search index has the articles and issues, and not the panel, drafts or duplicated formulas', () => {
  const pages = readPagefindFragments();
  const urls = new Set(pages.map((page) => page.url));
  for (const url of urls) {
    assert.match(
      url,
      /^\/edicoes\/[^/]+\/([^/]+\/)?$/,
      `The search indexed ${url}, which is neither an article nor an issue.`,
    );
    assert.ok(!/\/imprimir\/$/.test(url), `The search indexed the print version ${url}.`);
    assert.ok(!drafts.has(url.split('/')[2]), `The search indexed ${url}, from a draft issue.`);
  }
  assert.ok(![...urls].some((url) => url.startsWith('/admin/')), 'The search indexed the panel.');
  for (const issue of issues.filter((issue) => !drafts.has(issue.id)))
    assert.ok(urls.has(`/edicoes/${issue.id}/`), `The issue ${issue.id} is not in the search.`);
  for (const challenge of publishedChallenges)
    assert.ok(urls.has(challenge.url), `The article ${challenge.url} is not in the search.`);
  for (const page of pages)
    assert.ok(
      !/\\(frac|sqrt|cdot|times|pi)\b/.test(page.content),
      `The search has the TeX source of the formulas in ${page.url}.`,
    );
});

test('the QR link round-trips the progress and rejects damaged fragments', () => {
  const ids = [...new Set(publishedChallenges.map((challenge) => challenge.id))].sort();
  const link = progressLink(site.origin, ids);
  assert.ok(
    link.startsWith(`${site.origin}/desafios/#progresso=MAT1-`),
    `The link ${link} does not lead to the challenges at ${site.origin}.`,
  );
  assert.match(link, /#progresso=MAT1-[0-9A-Z]+$/);
  const hash = new URL(link).hash;
  assert.deepEqual(decodeProgress(codeFromLink(hash)!), ids);
  assert.deepEqual(
    decodeProgress(codeFromLink(hash.replace('MAT1-', 'MAT1%2D'))!),
    ids,
    'A percent-encoded code should be accepted.',
  );
  assert.ok(new URL(link).pathname === '/desafios/' && exists('dist/desafios/index.html'));

  for (const fragment of ['', '#', '#desafio-12345678', '#outra=MAT1-'])
    assert.equal(codeFromLink(fragment), null, `“${fragment}” should have no code.`);
  assert.throws(() => decodeProgress(codeFromLink('#progresso=')!), /Cola primeiro/);
  assert.throws(() => decodeProgress(codeFromLink(hash.slice(0, -3))!), /incompleto/);
  assert.throws(() => decodeProgress(codeFromLink(hash + 'U')!), /carácter que não pode ter/);
  assert.throws(() => decodeProgress(codeFromLink('#progresso=%E0%A4%A')!), /devia começar por MAT1-/);
});

// Every generated page, and the file an editor should open to fix each one.
const pages = listFiles('dist').filter((file) => file.endsWith('.html') && !file.startsWith('pagefind/'));
const articleOf = (file: string) =>
  file
    .match(/^edicoes\/([^/]+)\/([^/]+)\/index\.html$/)
    ?.filter((_, i) => i)
    .join('/');
// Demos do not use the Base layout: they have no canonical URL, share image or site fonts.
const demoOf = (file: string) => file.match(/^demonstracoes\/([^/]+)\/index\.html$/)?.[1];
function sourceOf(file: string) {
  const demo = demoOf(file);
  if (demo) return `In the demo src/content/demonstracoes/${demo}.yml`;
  const article = articleOf(file);
  if (article && article.split('/')[1] !== 'imprimir') {
    const markdown = ['md', 'mdx'].map((ext) => `src/content/artigos/${article}.${ext}`).find(exists);
    if (markdown) return `In the article ${markdown}`;
  }
  const issue = file.match(/^edicoes\/([^/]+)\//)?.[1];
  if (issue && exists(`src/content/edicoes/${issue}.md`))
    return `In the issue src/content/edicoes/${issue}.md or one of its articles`;
  return `In the site code (src/pages, src/components or src/layouts), page dist/${file}`;
}

test('the 404 page exists and stays out of the sitemap and the search', () => {
  assert.ok(exists('dist/404.html'), 'dist/404.html is missing: Cloudflare Pages would show its own error page.');
  assert.ok(!read('dist/sitemap-0.xml').includes('/404'), 'The 404 page is in the sitemap.');
});

test('the sitemap has the site pages, without the print versions', () => {
  const urls = [...read('dist/sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url));
  assert.ok(
    urls.some((url) => /^\/edicoes\/[^/]+\/[^/]+\/$/.test(url.pathname)),
    'The sitemap has no article.',
  );
  for (const url of urls) {
    assert.equal(url.origin, site.origin, `The sitemap has ${url.href}, which is not on the site ${site.origin}.`);
    assert.ok(
      !url.pathname.endsWith('/imprimir/'),
      `The sitemap has the print version ${url.pathname}. It repeats the issue's articles and must stay out (sitemap filter in astro.config.ts).`,
    );
    assert.ok(
      exists(`dist${url.pathname}index.html`),
      `The sitemap has ${url.pathname}, which does not exist in dist.`,
    );
  }
  assert.ok(!read('dist/404.html').includes('data-pagefind-body'), 'The 404 page would be indexed by the search.');
});

test('internal links lead to pages and anchors that exist', () => {
  const idCache = new Map<string, Set<string>>();
  const idsOf = (file: string) => {
    if (!idCache.has(file))
      idCache.set(file, new Set([...read(file).matchAll(/\sid="([^"]+)"/g)].map(([, id]) => decodeEntities(id))));
    return idCache.get(file)!;
  };
  const target = (path: string) =>
    (path.endsWith('/') ? [`${path}index.html`] : [path, `${path}.html`, `${path}/index.html`])
      .map((candidate) => `dist${candidate}`)
      .find((candidate) => exists(candidate) && !candidate.endsWith('/'));
  const errors: string[] = [];
  for (const file of pages) {
    const html = read(`dist/${file}`);
    const links = [
      ...[...html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)].map(([, url]) => url),
      ...[...html.matchAll(/\ssrcset="([^"]*)"/g)].flatMap(([, srcset]) =>
        srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]),
      ),
    ]
      .map(decodeEntities)
      .filter((url) => url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/pagefind/'));
    for (const url of new Set(links)) {
      const [path, anchor] = url.replace(/\?[^#]*/, '').split('#');
      const found = target(safeDecodeUri(path));
      const draft = path.match(/^\/edicoes\/([^/]+)\//)?.[1];
      if (!found && draft && drafts.has(draft))
        errors.push(
          `${sourceOf(file)}: the link ${url} leads to the issue ${draft}, which is a draft and therefore not on the site. Publish that issue first (untick «Rascunho» in the panel) or remove the link.`,
        );
      else if (!found)
        errors.push(
          `${sourceOf(file)}: the link ${url} leads to a page or file that does not exist. Fix the address or upload the file in the panel.`,
        );
      else if (anchor && found.endsWith('.html') && !idsOf(found).has(safeDecodeUri(anchor)))
        errors.push(
          `${sourceOf(file)}: the link ${url} points to #${safeDecodeUri(anchor)}, which does not exist in ${path}. Fix the part after the # in the link.`,
        );
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('every image has a description, and in articles it cannot be empty', () => {
  const errors: string[] = [];
  for (const file of pages) {
    const isArticle = articleOf(file) && !file.includes('/imprimir/');
    for (const [img] of read(`dist/${file}`).matchAll(/<img\b[^>]*>/g)) {
      const name =
        img
          .match(/\ssrc="([^"]*)"/)?.[1]
          .split('/')
          .pop()!
          .split('.')[0] ?? '(no address)';
      const alt = img.match(/\salt="([^"]*)"/)?.[1];
      if (alt === undefined)
        errors.push(
          `${sourceOf(file)}: the image «${name}» has no description (alt). Write a short description of what the image shows.`,
        );
      else if (isArticle && !alt.trim())
        errors.push(
          `${sourceOf(file)}: the image «${name}» has an empty description. Open the article in the panel and write what the image shows, for those who cannot see it.`,
        );
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('the PDFs referenced by the issues exist', () => {
  for (const issue of issues.filter((issue) => issue.pdf)) {
    const pdf = issue.pdf.replace(/^["']|["']$/g, '');
    // `pdf: ''` (an empty field saved by the panel) means the issue has no PDF
    if (!pdf) continue;
    assert.ok(
      pdf.startsWith('/') && exists(`public${pdf}`),
      `The issue src/content/edicoes/${issue.id}.md has the file ${pdf} in the «PDF original» field, which does not exist in public/. Upload the PDF in the panel or fix the field.`,
    );
  }
});

test('no site file is larger than 25 MiB (the Cloudflare Pages limit)', () => {
  const limit = 25 * 1024 * 1024;
  for (const file of listFiles('dist')) {
    const { size } = statSync(`${root}dist/${file}`);
    assert.ok(
      size <= limit,
      `The file ${file} has ${(size / 1024 / 1024).toFixed(1)} MiB and Cloudflare Pages does not publish files over 25 MiB. Reduce the PDF size (for example with "Reduce File Size" in Acrobat or a PDF compressor) and upload it again in the panel.`,
    );
  }
});

test('in the search, every article has the issue and section filters, every issue the issue filter, and all a sort date', () => {
  for (const { url, filters, content, meta } of readPagefindFragments()) {
    const isArticle = url.split('/').length === 5;
    assert.equal(filters.edicao?.length, 1, `${url} has no issue filter in the search.`);
    assert.equal(
      filters.seccao?.length,
      isArticle ? 1 : undefined,
      `${url} ${isArticle ? 'has no' : 'should not have a'} section filter in the search.`,
    );
    assert.match(
      read(`dist${url}index.html`),
      /data-pagefind-sort="data:\d{4}-\d{2}-\d{2}"/,
      `${url} has no date to sort the search results.`,
    );
    if (isArticle)
      assert.ok(
        content.startsWith(meta.title),
        `The text of ${url} in the search does not start with the title (is the section label in front of it?).`,
      );
  }
});

// Width and height of a JPEG, read from the SOF marker.
function jpegSize(bytes: Buffer): [number, number] | undefined {
  for (let i = 2; i < bytes.length; i += 2 + bytes.readUInt16BE(i + 2))
    if (bytes[i + 1] >= 0xc0 && bytes[i + 1] <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(bytes[i + 1]))
      return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
}

test('every page has a share image, which exists in dist with the declared size', () => {
  for (const file of pages.filter((file) => !file.startsWith('admin/') && !demoOf(file))) {
    const html = read(`dist/${file}`);
    const meta = (property: string) => html.match(new RegExp(`<meta property="og:${property}" content="([^"]*)"`))?.[1];
    const image = meta('image');
    assert.ok(image, `The page dist/${file} has no share image (og:image).`);
    const { origin, pathname } = new URL(image);
    assert.equal(origin, site.origin, `The share image of dist/${file} does not point to the site.`);
    assert.ok(exists(`dist${pathname}`), `The share image of dist/${file} (${pathname}) does not exist in dist.`);
    assert.deepEqual(
      jpegSize(readFileSync(`${root}dist${pathname}`)),
      [Number(meta('image:width')), Number(meta('image:height'))],
      `The share image of dist/${file} does not have the declared size.`,
    );
  }
});

test('every page has a canonical URL equal to og:url, and only the 404, the panel and the demos are hidden from search engines', () => {
  const errors: string[] = [];
  for (const file of pages) {
    const html = read(`dist/${file}`);
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    if (file === '404.html' || file.startsWith('admin/') || demoOf(file)) {
      if (!noindex)
        errors.push(
          `The page dist/${file} has no <meta name="robots" content="noindex"> and would be indexed by search engines.`,
        );
      if (canonical) errors.push(`The page dist/${file} should not have a canonical URL: it is served at other URLs.`);
      continue;
    }
    if (noindex)
      errors.push(
        `${sourceOf(file)}: the page has noindex and would stay out of search engines. Only the 404, the panel and the demos may have it.`,
      );
    if (!canonical) {
      errors.push(`${sourceOf(file)}: the page has no canonical URL (<link rel="canonical">). Use the Base layout.`);
      continue;
    }
    const url = new URL(decodeEntities(canonical));
    if (url.origin !== site.origin)
      errors.push(
        `${sourceOf(file)}: the canonical URL ${canonical} is not on the site ${site.origin} (the domain is set in astro.config.ts).`,
      );
    if (url.search || url.hash)
      errors.push(`${sourceOf(file)}: the canonical URL ${canonical} has a ? or #, and should not.`);
    if (!url.pathname.endsWith('/') || !exists(`dist${safeDecodeUri(url.pathname)}index.html`))
      errors.push(`${sourceOf(file)}: the canonical URL ${canonical} leads to a page that does not exist.`);
    if (ogUrl !== canonical)
      errors.push(`${sourceOf(file)}: the canonical URL (${canonical}) and og:url (${ogUrl}) are different.`);
  }
  assert.ok(!errors.length, errors.join('\n'));
});

const jsonLdBlocks = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => json);

test('every article and issue has valid structured data, with the issue cover', () => {
  const errors: string[] = [];
  for (const file of pages) {
    const html = read(`dist/${file}`);
    const blocks = jsonLdBlocks(html);
    const isArticle = articleOf(file) && !file.includes('/imprimir/');
    const isIssue = /^edicoes\/[^/]+\/index\.html$/.test(file);
    if (!isArticle && !isIssue) continue;
    if (blocks.length !== 1) {
      errors.push(`${sourceOf(file)}: the page has ${blocks.length} structured data (JSON-LD) blocks instead of one.`);
      continue;
    }
    if (blocks[0].includes('<'))
      errors.push(`${sourceOf(file)}: the structured data has an unescaped <, which can break the page.`);
    let data;
    try {
      data = JSON.parse(blocks[0]);
    } catch (error) {
      errors.push(`${sourceOf(file)}: the structured data is not valid JSON (${(error as Error).message}).`);
      continue;
    }
    const missing = (field: string) =>
      errors.push(`${sourceOf(file)}: «${field}» is missing from the structured data.`);
    const issueDate = issues.find((issue) => issue.id === file.split('/')[1])?.data;
    const type = isArticle ? 'Article' : 'PublicationIssue';
    if (data['@context'] !== 'https://schema.org' || data['@type'] !== type)
      errors.push(`${sourceOf(file)}: the structured data should be of the schema.org type ${type}.`);
    if (data.datePublished !== issueDate)
      errors.push(
        `${sourceOf(file)}: the date in the structured data (${data.datePublished}) is not the issue's date (${issueDate}).`,
      );
    if (data.url !== html.match(/<link rel="canonical" href="([^"]*)"/)?.[1])
      errors.push(`${sourceOf(file)}: the url in the structured data (${data.url}) is not the canonical URL.`);
    if (data.inLanguage !== 'pt-PT') missing('inLanguage: pt-PT');
    if (!data.publisher?.name) missing('publisher');
    if (isArticle) {
      if (typeof data.headline !== 'string' || !data.headline.trim())
        errors.push(
          `${sourceOf(file)}: the article has no title in the structured data. Fill in «Título» in the panel.`,
        );
      if (
        data.isPartOf?.['@type'] !== 'PublicationIssue' ||
        !exists(`dist${new URL(data.isPartOf.url).pathname}index.html`)
      )
        missing('isPartOf, with an issue that exists');
      for (const person of data.author ?? [])
        if (person['@type'] !== 'Person' || !/^\p{Lu}/u.test(person.name ?? ''))
          errors.push(
            `${sourceOf(file)}: the author «${person.name}» does not look like a person's name. Write one name per person in the «Autores» field.`,
          );
    }
    if (!data.image) {
      missing('image');
      continue;
    }
    const image = new URL(data.image);
    if (image.origin !== site.origin || !exists(`dist${image.pathname}`))
      errors.push(`${sourceOf(file)}: the structured data image (${data.image}) does not exist in dist.`);
    if (data.image !== html.match(/<meta property="og:image" content="([^"]*)"/)?.[1])
      errors.push(`${sourceOf(file)}: the structured data image is not the same as og:image.`);
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('article update dates come from git, only after the launch, and the newspaper logo exists and is square', () => {
  const errors: string[] = [];
  const logos = new Set<string>();
  for (const file of pages.filter((file) => articleOf(file) && !file.includes('/imprimir/'))) {
    const json = jsonLdBlocks(read(`dist/${file}`))[0];
    if (!json) continue; // a missing block is already caught by the structured data check
    const data = JSON.parse(json);
    const markdown = ['md', 'mdx'].map((ext) => `src/content/artigos/${articleOf(file)}.${ext}`).find(exists);
    const expected = markdown && lastUpdated(markdown);
    if (data.dateModified !== expected)
      errors.push(
        `${sourceOf(file)}: the update date in the structured data (${data.dateModified ?? 'none'}) is not the date of the last commit after ${LAUNCH_DATE} (${expected ?? 'none'}).`,
      );
    else if (expected && expected < data.datePublished)
      errors.push(
        `${sourceOf(file)}: the update date (${expected}) is before the issue's date (${data.datePublished}).`,
      );
    if (data.publisher?.logo?.url) logos.add(data.publisher.logo.url);
    else errors.push(`${sourceOf(file)}: the newspaper logo (publisher.logo) is missing from the structured data.`);
  }
  for (const url of logos) {
    const { origin, pathname } = new URL(url);
    if (origin !== site.origin || !exists(`dist${pathname}`)) {
      errors.push(`The logo ${url} does not exist in dist. It should be at public${pathname}.`);
      continue;
    }
    const png = readFileSync(`${root}dist${pathname}`);
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (png.toString('latin1', 1, 4) !== 'PNG') errors.push(`The logo public${pathname} is not a PNG.`);
    else if (width !== height || width < 112)
      errors.push(`The logo public${pathname} is ${width}×${height}: it must be square, at least 112 px.`);
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('robots.txt points to the site sitemap and blocks neither sitemap pages nor noindex pages', () => {
  assert.ok(exists('dist/robots.txt'), 'dist/robots.txt is missing (generated by src/pages/robots.txt.ts).');
  const lines = read('dist/robots.txt')
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim());
  const sitemaps = lines.filter((line) => /^sitemap:/i.test(line)).map((line) => line.replace(/^sitemap:\s*/i, ''));
  assert.deepEqual(
    sitemaps,
    [`${site.origin}/sitemap-index.xml`],
    `robots.txt should only point to the sitemap ${site.origin}/sitemap-index.xml (the domain is set in astro.config.ts).`,
  );
  assert.ok(exists('dist/sitemap-index.xml'), 'robots.txt points to sitemap-index.xml, which does not exist in dist.');
  const disallowed = lines
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.replace(/^disallow:\s*/i, ''))
    .filter(Boolean);
  const urls = [...read('dist/sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname);
  const demoPaths = pages.filter(demoOf).map((file) => `/${file.replace(/index\.html$/, '')}`);
  for (const path of [...urls, '/404.html', '/admin/', ...demoPaths])
    for (const rule of disallowed)
      assert.ok(
        !path.startsWith(rule),
        `robots.txt blocks ${path} (Disallow: ${rule}). Sitemap pages must be readable, and so must noindex pages, otherwise the noindex is never seen.`,
      );
});

test('/sitemap.xml redirects to sitemap-index.xml, and every _redirects rule leads to a file that exists', () => {
  assert.ok(exists('dist/_redirects'), 'public/_redirects is missing (with the /sitemap.xml redirect).');
  const rules = read('dist/_redirects')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));
  assert.deepEqual(
    rules.find(([from]) => from === '/sitemap.xml'),
    ['/sitemap.xml', '/sitemap-index.xml', '301'],
    'public/_redirects should have the line «/sitemap.xml /sitemap-index.xml 301».',
  );
  for (const [from, to] of rules) {
    if (!to.startsWith('/')) continue;
    const file = to.endsWith('/') ? `${to}index.html` : to;
    assert.ok(exists(`dist${file}`), `public/_redirects sends ${from} to ${to}, which does not exist in dist.`);
  }
});

interface HeaderRule {
  pattern: string;
  headers: Record<string, string | undefined>;
}

function headerRules(): HeaderRule[] {
  assert.ok(exists('dist/_headers'), 'dist/_headers is missing: public/_headers was not copied.');
  const rules: HeaderRule[] = [];
  for (const line of read('dist/_headers').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: {} });
    else {
      const [, name, value] = line.trim().match(/^([^:]+):\s*(.*)$/) ?? [];
      assert.ok(name && rules.length, `public/_headers has a line that cannot be parsed: «${line.trim()}».`);
      rules.at(-1)!.headers[name.toLowerCase()] = value;
    }
  }
  return rules;
}

test('_headers protects every page and only sets a long cache on files with a hash in their name', () => {
  const rules = headerRules();
  const global = rules.find((rule) => rule.pattern === '/*')?.headers ?? {};
  for (const name of [
    'x-content-type-options',
    'referrer-policy',
    'x-frame-options',
    'content-security-policy',
    'permissions-policy',
    'strict-transport-security',
  ])
    assert.ok(global[name], `public/_headers has no ${name} in the /* rule (for every page).`);
  assert.ok(
    !/(script|default)-src/.test(global['content-security-policy'] ?? ''),
    'The Content-Security-Policy in public/_headers restricts scripts: the panel (jsDelivr, unpkg) and the search (WebAssembly) would stop working.',
  );

  const files = listFiles('dist')
    .filter((file) => statSync(`${root}dist/${file}`).isFile())
    .map((file) => `/${file}`);
  const hasHash = (file: string) => /\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(file);
  for (const { pattern, headers } of rules.filter((rule) => rule.pattern !== '/*')) {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const matched = files.filter((file) => regex.test(file));
    assert.ok(
      matched.length,
      `The rule ${pattern} in public/_headers matches no file in dist. Is the address spelled correctly?`,
    );
    const maxAge = Number(headers['cache-control']?.match(/max-age=(\d+)/)?.[1] ?? 0);
    if (maxAge > 86400 || /immutable/.test(headers['cache-control'] ?? ''))
      for (const file of matched)
        assert.ok(
          hasHash(file),
          `The rule ${pattern} in public/_headers caches ${file} for a long time, but its name has no hash: returning visitors would keep seeing the old version.`,
        );
  }
});

test('preloaded fonts are the ones the CSS uses, and the main cover of the home page and of the issues loads first', () => {
  const errors: string[] = [];
  for (const file of pages.filter((file) => !file.startsWith('admin/') && !demoOf(file))) {
    const html = read(`dist/${file}`);
    const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .map(([, href]) => read(`dist${href}`))
      .join('');
    const preloads = [...html.matchAll(/<link rel="preload"[^>]*>/g)].map(([link]) => link);
    if (preloads.length !== 2)
      errors.push(
        `The page dist/${file} has ${preloads.length} font preloads instead of two (src/layouts/Base.astro).`,
      );
    for (const link of preloads) {
      const href = link.match(/\shref="([^"]+)"/)?.[1] ?? '';
      if (!/\sas="font"/.test(link) || !/\scrossorigin/.test(link))
        errors.push(
          `The preload of ${href} in dist/${file} needs as="font" and crossorigin, otherwise the font is downloaded twice.`,
        );
      if (!exists(`dist${href}`)) errors.push(`The preloaded font ${href} in dist/${file} does not exist in dist.`);
      else if (!css.includes(`url(${href})`))
        errors.push(
          `The preloaded font ${href} in dist/${file} is not the one the page CSS uses: it would be downloaded for nothing.`,
        );
    }
    if (file === 'index.html' || /^edicoes\/[^/]+\/index\.html$/.test(file)) {
      const cover = html.match(/<img\b[^>]*>/)?.[0];
      if (cover && (/loading="lazy"/.test(cover) || !/fetchpriority="high"/.test(cover)))
        errors.push(
          `The cover at the top of dist/${file} must have loading="eager" and fetchpriority="high" to show up as early as possible. Fix it in src/pages/index.astro or src/pages/edicoes/[edicao]/index.astro.`,
        );
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

// ---- Demos (src/content/demonstracoes): they run isolated, without network access and out of search engines.

const articleFiles = listFiles('src/content/artigos').filter((file) => /\.mdx?$/.test(file));
const demoSources = readdirSync(root + 'src/content/demonstracoes')
  .filter((file) => file.endsWith('.yml'))
  .map((file) => file.replace(/\.yml$/, ''));
const demoPages = pages.filter(demoOf);
// The teacher's code, without what the site adds to it (src/lib/demos.js).
const teacherCode = (html: string) =>
  html.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*">|<script>new ResizeObserver[\s\S]*?<\/script>/g,
    '',
  );

test('every «Demonstração» block in the articles uses a demo that exists', () => {
  const errors: string[] = [];
  const pattern = new RegExp(demoBlock.pattern.source, 'gm');
  for (const file of articleFiles) {
    const text = read(`src/content/artigos/${file}`);
    const blocks = [...text.matchAll(pattern)];
    if ((text.match(/<Demonstracao\b/g) ?? []).length !== blocks.length)
      errors.push(
        `In the article src/content/artigos/${file}: there is a hand-written <Demonstracao> that the panel does not recognise. Delete it and insert it again with Inserir → Demonstração.`,
      );
    for (const block of blocks) {
      const id = block.groups!.id;
      if (!demoSources.includes(id))
        errors.push(
          `In the article src/content/artigos/${file}: the «Demonstração» block uses «${id}», which does not exist. Pick another one in the block, or create it under «Demonstrações» in the panel.`,
        );
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('every demo is small, only loads approved libraries and uses nothing that is blocked', () => {
  assert.deepEqual(
    demoPages.map(demoOf).toSorted(),
    demoSources.toSorted(),
    'There are demos in src/content/demonstracoes without a page in dist, or the other way round.',
  );
  const blocked: [RegExp, (match: string) => string][] = [
    [
      /\b(alert|confirm|prompt)\s*\(/,
      (name) =>
        `${name}(), which is blocked in demos and shows nothing. Write the message in a paragraph of the page instead`,
    ],
    [
      /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/,
      (name) =>
        `${name}, which does not work in demos (they are isolated from the rest of the site). Remove that part, or ask the AI for a version that stores nothing in the browser`,
    ],
    [
      /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|\bwindow\.open\s*\(/,
      (name) => `${name.replace(/\s*\($/, '()')}, which is blocked: demos cannot contact other sites or open windows`,
    ],
  ];
  const errors: string[] = [];
  for (const file of demoPages) {
    const code = teacherCode(read(`dist/${file}`));
    const where = sourceOf(file);
    const size = Buffer.byteLength(code);
    if (size > MAX_SIZE)
      errors.push(
        `${where}: the code is ${Math.round(size / 1000)} KB; the maximum is ${MAX_SIZE / 1000} KB. Images embedded in the code (data:) take a lot of space: draw them with the canvas or remove them.`,
      );
    const addresses = [
      ...code.matchAll(/\s(?:src|href|action|data|poster)\s*=\s*["']([^"']*)["']/gi),
      ...code.matchAll(/url\(\s*["']?([^"')]+)/gi),
      ...code.matchAll(/@import\s+["']([^"']+)/gi),
      ...code.matchAll(/\bimport\s*\(?\s*(?:[\w{}\s,*]+from\s*)?["']([^"']+)["']/g),
    ].map(([, url]) => url.trim());
    for (const url of new Set(addresses))
      if (!/^(data:|blob:|#)/.test(url) && !ALLOWED_LIBRARIES.some((library) => url.startsWith(library)))
        errors.push(
          `${where}: the code uses ${url}, which is not in the list of approved libraries and will not load. Demos can only load ${ALLOWED_LIBRARIES.map((library) => `${library}…`).join(' or ')} (guide, section «Demonstrações»); for another one, talk to Miguel.`,
        );
    for (const [regex, message] of blocked) {
      const match = code.match(regex);
      if (match) errors.push(`${where}: the code uses ${message(match[1] ?? match[0])}.`);
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('the site iframes have a title, and the demo iframes are isolated (sandbox without allow-same-origin)', () => {
  const errors: string[] = [];
  for (const file of pages.filter((file) => !demoOf(file))) {
    for (const [iframe] of read(`dist/${file}`).matchAll(/<iframe\b[^>]*>/g)) {
      const attribute = (name: string) => iframe.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
      const src = decodeEntities(attribute('src') ?? '');
      if (!attribute('title')?.trim())
        errors.push(
          `${sourceOf(file)}: the iframe ${src} has no title. Screen reader users would not know what it is.`,
        );
      const id = src.match(/^\/demonstracoes\/([^/]+)\/$/)?.[1];
      if (!id)
        errors.push(
          `${sourceOf(file)}: there is an <iframe> from ${src || '(no address)'}. Content from other sites only comes in through the «Applet GeoGebra» block, and demos through the «Demonstração» block.`,
        );
      else if (attribute('sandbox') !== 'allow-scripts')
        errors.push(
          `In the site code (src/components/Demonstracao.astro), page dist/${file}: the iframe ${src} has sandbox="${attribute('sandbox') ?? ''}" instead of sandbox="allow-scripts". Without a sandbox, or with allow-same-origin, the demo could read the panel session and the students' progress.`,
        );
      else if (!exists(`dist${src}index.html`))
        errors.push(`${sourceOf(file)}: the iframe leads to the demo «${id}», which does not exist in dist.`);
    }
  }
  assert.ok(!errors.length, errors.join('\n'));
});

test('demo pages start with the CSP, have noindex and stay out of the sitemap, and _headers isolates them', () => {
  const errors: string[] = [];
  const sitemap = read('dist/sitemap-0.xml');
  for (const file of demoPages) {
    const html = read(`dist/${file}`);
    const csp = html.match(/<head\b[^>]*>\s*<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)?.[1];
    if (csp !== CSP)
      errors.push(
        `The page dist/${file} does not start with the Content-Security-Policy from src/lib/demos.js: without it, the demo could load code from any site. Fix demoPage() in src/lib/demos.js.`,
      );
    if (!/<meta name="robots" content="noindex">/.test(html))
      errors.push(
        `The page dist/${file} has no <meta name="robots" content="noindex"> (demoPage() in src/lib/demos.js).`,
      );
    if (sitemap.includes(`/${file.replace(/index\.html$/, '')}`))
      errors.push(`The demo dist/${file} is in the sitemap. It must stay out (sitemap filter in astro.config.ts).`);
  }
  const rule = headerRules().find((rule) => rule.pattern === '/demonstracoes/*')?.headers ?? {};
  const policy = rule['content-security-policy'] ?? '';
  if (!/(^|;)\s*sandbox allow-scripts\s*(;|$)/.test(policy) || /allow-same-origin/.test(policy))
    errors.push(
      `public/_headers must have, in the /demonstracoes/* rule, «Content-Security-Policy: sandbox allow-scripts; …» (without allow-same-origin). Otherwise, opening the demo outside the article runs its code on the site, with access to the panel session.`,
    );
  if (!/connect-src 'none'/.test(policy))
    errors.push(`public/_headers must have connect-src 'none' in the CSP of the /demonstracoes/* rule.`);
  if (!/noindex/.test(rule['x-robots-tag'] ?? ''))
    errors.push('public/_headers must have «X-Robots-Tag: noindex» in the /demonstracoes/* rule.');
  assert.ok(!errors.length, errors.join('\n'));
});

test('every GeoGebra applet has a valid link, a title and a height, and only contacts GeoGebra after the click', () => {
  const errors: string[] = [];
  const pattern = new RegExp(geogebraBlock.pattern.source, 'gm');
  for (const file of articleFiles) {
    const text = read(`src/content/artigos/${file}`);
    const blocks = [...text.matchAll(pattern)];
    if ((text.match(/<GeoGebra\b/g) ?? []).length !== blocks.length)
      errors.push(
        `In the article src/content/artigos/${file}: there is a hand-written <GeoGebra> that the panel does not recognise. Delete it and insert it again with Inserir → Applet GeoGebra.`,
      );
    for (const block of blocks) {
      const { ligacao: link, titulo: title, altura: height } = geogebraBlock.fromBlock(block);
      if (!geogebraUrls(link, height))
        errors.push(
          `In the article src/content/artigos/${file}: the link «${link}» of the «Applet GeoGebra» block is not an applet link. In GeoGebra, open the applet, press «Partilhar» (Share) and copy the link (https://www.geogebra.org/m/…).`,
        );
      if (!title.trim())
        errors.push(
          `In the article src/content/artigos/${file}: the GeoGebra applet ${link} has no title. Write in the block what the applet shows; it is what screen readers announce.`,
        );
      if (!(Number.isInteger(height) && height >= 250 && height <= 900))
        errors.push(
          `In the article src/content/artigos/${file}: the height of the GeoGebra applet ${link} is ${height}; it must be a whole number between 250 and 900.`,
        );
    }
  }
  for (const file of pages)
    for (const [element] of read(`dist/${file}`).matchAll(/<maismat-geogebra\b[^>]*>/g)) {
      const src = decodeEntities(element.match(/\sdata-src="([^"]*)"/)?.[1] ?? '');
      if (!/^https:\/\/www\.geogebra\.org\/material\/iframe\/id\/[A-Za-z0-9]{8}\//.test(src))
        errors.push(
          `In the site code (src/components/GeoGebra.astro), page dist/${file}: the applet button would open ${src || '(nothing)'}, which is not a GeoGebra applet.`,
        );
      if (!element.match(/\sdata-titulo="([^"]*)"/)?.[1].trim())
        errors.push(`${sourceOf(file)}: the GeoGebra applet ${src} has no title.`);
    }
  assert.ok(!errors.length, errors.join('\n'));
});
