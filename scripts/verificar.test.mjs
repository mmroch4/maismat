// Verificações depois do build (`npm run build` corre-as no fim; à parte: `npm run verificar`).
// Apanham os enganos que o painel não impede: respostas impossíveis, ids repetidos, respostas à vista, rascunhos publicados.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import config from '../astro.config.mjs';
import { appletGeoGebra, desafio as bloco, demonstracao as blocoDemonstracao, geogebra } from '../public/admin/componentes.js';
import { BIBLIOTECAS, CSP, TAMANHO_MAXIMO } from '../src/lib/demonstracoes.mjs';
import { codificar, codigoDaLigacao, descodificar, ligacaoProgresso } from '../src/lib/progresso.mjs';
import { LANCAMENTO, ultimaAtualizacao } from '../src/lib/git.mjs';
import { normalizar } from '../src/lib/respostas.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
// O domínio vem só do astro.config.mjs.
const site = new URL(config.site);
const ler = (caminho) => readFileSync(raiz + caminho, 'utf8');
const existe = (caminho) => existsSync(raiz + caminho);

const frontmatter = (texto) =>
  Object.fromEntries([...(texto.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^(\w+):[ \t]*(.*)$/gm)].map(([, k, v]) => [k, v.trim()]));

const edicoes = readdirSync(raiz + 'src/content/edicoes')
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ id: f.replace(/\.md$/, ''), ...frontmatter(ler(`src/content/edicoes/${f}`)) }));
const rascunhos = new Set(edicoes.filter((e) => e.rascunho === 'true').map((e) => e.id));

// Todos os desafios, incluindo os das edições em rascunho (para os enganos aparecerem antes de publicar).
const padrao = new RegExp(bloco.pattern.source, 'gm');
const desafios = readdirSync(raiz + 'src/content/artigos', { recursive: true })
  .filter((f) => /\.mdx?$/.test(f))
  .flatMap((f) => {
    const texto = ler(`src/content/artigos/${f}`);
    const { edicao } = frontmatter(texto);
    const url = `/edicoes/${edicao}/${f.split('/').pop().replace(/\.mdx?$/, '')}/`;
    return [...texto.matchAll(padrao)].map((m) => {
      const d = bloco.fromBlock(m);
      const respostas = d.resposta ? d.resposta.split('|') : [];
      return { ...d, respostas, ficheiro: f, url, publicado: !rascunhos.has(edicao) };
    });
  });
const publicados = desafios.filter((d) => d.publicado);
const onde = (d) => `“${d.titulo}” (${d.ficheiro})`;

const entidades = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const texto = (html) =>
  html
    .replace(/<span class="katex-mathml">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (e, hex, dec, nome) =>
      hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : (entidades[nome] ?? e),
    );
const simples = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const contem = (onde, r) => new RegExp(`(^|[^\\p{L}\\p{N}])${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(onde);

let arquivo;
before(() => {
  assert.ok(existe('dist/desafios/index.html'), 'Falta o site gerado: corre primeiro `npm run build`.');
  arquivo = ler('dist/desafios/index.html');
});

test('cada desafio tem um id, e só os republicados partilham o mesmo', () => {
  const titulos = new Map();
  for (const d of desafios) {
    assert.match(d.id, /^desafio-[0-9a-f]{8}$/, `${onde(d)} não tem um id válido. Abre-o no painel e guarda.`);
    const outro = titulos.get(d.id);
    assert.ok(!outro || outro.titulo === d.titulo, `${onde(outro ?? d)} e ${onde(d)} têm o mesmo id. Se são problemas diferentes, apaga o identificador de um deles no painel.`);
    titulos.set(d.id, d);
  }
});

test('as respostas podem ser dadas no site', () => {
  for (const d of desafios) {
    if (d.opcoes.length && d.respostas.length) {
      const opcoes = d.opcoes.map((o) => normalizar(o, d.casas));
      assert.ok(
        d.respostas.some((r) => opcoes.includes(normalizar(r, d.casas))),
        `${onde(d)}: a resposta “${d.resposta}” não é nenhuma das opções (${d.opcoes.join(' / ')}).`,
      );
    }
    if (d.casas !== undefined)
      for (const r of d.respostas) assert.ok(!Number.isNaN(parseFloat(normalizar(r))), `${onde(d)}: tem casas decimais mas a resposta “${r}” não é um número.`);
  }
});

test('cada desafio publicado aceita a sua resposta no artigo', () => {
  for (const d of publicados.filter((d) => d.respostas.length)) {
    const html = ler(`dist${d.url}index.html`);
    const hashes = html.match(new RegExp(`id="${d.id}" data-hashes="([0-9a-f,]*)"`))?.[1].split(',');
    assert.ok(hashes, `${onde(d)}: não encontrei o desafio em dist${d.url}.`);
    for (const r of d.respostas) {
      const h = createHash('sha256').update(d.id + normalizar(r, d.casas)).digest('hex');
      assert.ok(hashes.includes(h), `${onde(d)}: o site não aceitaria a resposta “${r}”.`);
    }
  }
});

test('o arquivo tem todos os desafios publicados e as ligações levam a cada um', () => {
  const ligacoes = [...arquivo.matchAll(/<h3[^>]*><a href="([^"#]+)#(desafio-[0-9a-f]{8})"/g)].map(([, url, id]) => `${url}#${id}`);
  assert.deepEqual(ligacoes.toSorted(), publicados.map((d) => `${d.url}#${d.id}`).toSorted());
  for (const d of publicados) assert.ok(ler(`dist${d.url}index.html`).includes(`id="${d.id}"`), `${onde(d)}: a âncora #${d.id} não existe no artigo.`);
});

test('o arquivo não revela respostas', () => {
  assert.ok(!/data-hashes|type="radio"|class="[^"]*resposta/.test(arquivo), 'O arquivo tem hashes ou formulários de resposta.');
  const cartoes = [...arquivo.matchAll(/<li class="desafio"[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
  for (const d of publicados) {
    const fonte = simples(`${d.titulo} ${d.enunciado}`);
    for (const [, , html] of cartoes.filter(([, id]) => id === d.id)) {
      // Só o título e o excerto vêm do artigo; uma resposta que lá esteja tem de vir do próprio enunciado.
      const visivel = simples(texto([...html.matchAll(/<h3[\s\S]*?<\/h3>|<p class="excerto[\s\S]*?<\/p>/g)].join(' ')));
      for (const r of d.respostas.map(simples))
        assert.ok(!contem(visivel, r) || contem(fonte, r), `O cartão de ${onde(d)} mostra a resposta “${r}”.`);
    }
  }
});

test('as edições em rascunho não aparecem no site', () => {
  const sitemap = existe('dist/sitemap-0.xml') ? ler('dist/sitemap-0.xml') : '';
  for (const e of rascunhos) {
    assert.ok(!existe(`dist/edicoes/${e}`), `A edição em rascunho ${e} foi publicada.`);
    assert.ok(!sitemap.includes(`/edicoes/${e}/`), `A edição em rascunho ${e} está no sitemap.`);
    assert.ok(!arquivo.includes(`/edicoes/${e}/`), `O arquivo de desafios tem desafios da edição em rascunho ${e}.`);
  }
});

test('o código de progresso leva e traz os ids, e recusa códigos estragados', () => {
  const ids = [...new Set(desafios.map((d) => d.id))].sort();
  for (const lista of [[], ids.slice(0, 2), ids]) assert.deepEqual(descodificar(codificar(lista)), lista);
  const codigo = codificar(ids.slice(0, 10));
  assert.deepEqual(descodificar(` ${codigo.toLowerCase().replace(/.{20}/g, '$&\n')} `), ids.slice(0, 10), 'Minúsculas e quebras de linha deviam ser aceites.');

  for (const vazio of ['', '  \n ']) assert.throws(() => descodificar(vazio), /Cola primeiro/);
  assert.throws(() => descodificar('MAT2-' + codigo.slice(5)), /versão do \+MAT que este site não conhece/);
  assert.throws(() => descodificar(codigo.slice(5)), /devia começar por MAT1-/);
  assert.throws(() => descodificar(codigo + 'U'), /carácter que não pode ter/);
  assert.throws(() => codificar(['desafio-1234567']), /Id inválido/);
  assert.throws(() => codificar(['maismat:desafio-12345678']), /Id inválido/);
  assert.throws(() => codificar(['desafio-1234567G']), /Id inválido/);

  const alfabeto = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  for (let i = 5; i < codigo.length; i++) {
    assert.throws(() => descodificar(codigo.slice(0, i)), /incompleto/, `O código cortado em ${i} caracteres foi aceite.`);
    for (const c of alfabeto.replace(codigo[i], ''))
      assert.throws(() => descodificar(codigo.slice(0, i) + c + codigo.slice(i + 1)), /incompleto/, `A troca do carácter ${i} por ${c} não foi detetada.`);
  }
});

test('o rss.xml tem todas as edições publicadas, da mais recente para a mais antiga, e as ligações existem', () => {
  assert.ok(existe('dist/rss.xml'), 'Falta o dist/rss.xml.');
  const itens = [...ler('dist/rss.xml').matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => ({
    link: x.match(/<link>([^<]+)<\/link>/)?.[1] ?? '',
    data: new Date(x.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? NaN),
  }));
  const ids = itens.map((i) => i.link.match(/\/edicoes\/([^/]+)\/$/)?.[1]);
  assert.deepEqual(ids.toSorted(), edicoes.filter((e) => !rascunhos.has(e.id)).map((e) => e.id).toSorted());
  for (const e of rascunhos) assert.ok(!ids.includes(e), `A edição em rascunho ${e} está no rss.xml.`);
  for (let i = 1; i < itens.length; i++) assert.ok(itens[i - 1].data >= itens[i].data, 'O rss.xml não está da edição mais recente para a mais antiga.');
  for (const { link } of itens) assert.ok(existe(`dist${new URL(link).pathname}index.html`), `O rss.xml liga para ${link}, que não existe.`);
});

test('o índice da pesquisa tem os artigos e as edições, e não tem o painel, rascunhos nem fórmulas repetidas', () => {
  const pasta = 'dist/pagefind/fragment';
  assert.ok(existe(pasta), 'Falta o índice da pesquisa: o Pagefind não correu sobre dist.');
  const paginas = readdirSync(raiz + pasta).map((f) => JSON.parse(gunzipSync(readFileSync(`${raiz}${pasta}/${f}`)).toString('utf8').replace(/^pagefind_dcd/, '')));
  const urls = new Set(paginas.map((p) => p.url));
  for (const u of urls) {
    assert.match(u, /^\/edicoes\/[^/]+\/([^/]+\/)?$/, `A pesquisa indexou ${u}, que não é um artigo nem uma edição.`);
    assert.ok(!/\/imprimir\/$/.test(u), `A pesquisa indexou a versão para imprimir ${u}.`);
    assert.ok(!rascunhos.has(u.split('/')[2]), `A pesquisa indexou ${u}, de uma edição em rascunho.`);
  }
  assert.ok(![...urls].some((u) => u.startsWith('/admin/')), 'A pesquisa indexou o painel.');
  for (const e of edicoes.filter((e) => !rascunhos.has(e.id))) assert.ok(urls.has(`/edicoes/${e.id}/`), `A edição ${e.id} não está na pesquisa.`);
  for (const d of publicados) assert.ok(urls.has(d.url), `O artigo ${d.url} não está na pesquisa.`);
  for (const p of paginas) assert.ok(!/\\(frac|sqrt|cdot|times|pi)\b/.test(p.content), `A pesquisa tem o código TeX das fórmulas em ${p.url}.`);
});

test('a ligação do QR leva e traz o progresso, e recusa fragmentos estragados', () => {
  const ids = [...new Set(publicados.map((d) => d.id))].sort();
  const ligacao = ligacaoProgresso(site.origin, ids);
  assert.ok(ligacao.startsWith(`${site.origin}/desafios/#progresso=MAT1-`), `A ligação ${ligacao} não leva aos desafios em ${site.origin}.`);
  assert.match(ligacao, /#progresso=MAT1-[0-9A-Z]+$/);
  const hash = new URL(ligacao).hash;
  assert.deepEqual(descodificar(codigoDaLigacao(hash)), ids);
  assert.deepEqual(descodificar(codigoDaLigacao(hash.replace('MAT1-', 'MAT1%2D'))), ids, 'O código com %-codificação devia ser aceite.');
  assert.ok(new URL(ligacao).pathname === '/desafios/' && existe('dist/desafios/index.html'));

  for (const h of ['', '#', '#desafio-12345678', '#outra=MAT1-']) assert.equal(codigoDaLigacao(h), null, `“${h}” não devia ter código.`);
  assert.throws(() => descodificar(codigoDaLigacao('#progresso=')), /Cola primeiro/);
  assert.throws(() => descodificar(codigoDaLigacao(hash.slice(0, -3))), /incompleto/);
  assert.throws(() => descodificar(codigoDaLigacao(hash + 'U')), /carácter que não pode ter/);
  assert.throws(() => descodificar(codigoDaLigacao('#progresso=%E0%A4%A')), /devia começar por MAT1-/);
});

// Todas as páginas geradas, e o ficheiro que quem edita deve abrir para corrigir cada uma.
const paginas = readdirSync(raiz + 'dist', { recursive: true }).filter((f) => f.endsWith('.html') && !f.startsWith('pagefind/'));
const artigoDe = (f) => f.match(/^edicoes\/([^/]+)\/([^/]+)\/index\.html$/)?.filter((_, i) => i).join('/');
// As demonstrações não usam o layout Base: não têm canónico, imagem de partilha nem fontes do site.
const demonstracaoDe = (f) => f.match(/^demonstracoes\/([^/]+)\/index\.html$/)?.[1];
function fonte(f) {
  const demonstracao = demonstracaoDe(f);
  if (demonstracao) return `Na demonstração src/content/demonstracoes/${demonstracao}.yml`;
  const artigo = artigoDe(f);
  if (artigo && artigo.split('/')[1] !== 'imprimir') {
    const md = ['md', 'mdx'].map((x) => `src/content/artigos/${artigo}.${x}`).find(existe);
    if (md) return `No artigo ${md}`;
  }
  const edicao = f.match(/^edicoes\/([^/]+)\//)?.[1];
  if (edicao && existe(`src/content/edicoes/${edicao}.md`)) return `Na edição src/content/edicoes/${edicao}.md ou num dos seus artigos`;
  return `No código do site (src/pages, src/components ou src/layouts), página dist/${f}`;
}
const atributo = (html) => html.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (e, hex, dec, nome) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : (entidades[nome] ?? e));
const decodificar = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

test('a página 404 existe e fica fora do sitemap e da pesquisa', () => {
  assert.ok(existe('dist/404.html'), 'Falta o dist/404.html: o Cloudflare Pages mostraria a página de erro dele.');
  assert.ok(!ler('dist/sitemap-0.xml').includes('/404'), 'A página 404 está no sitemap.');
});

test('o sitemap tem as páginas do site, sem as versões para imprimir', () => {
  const urls = [...ler('dist/sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u));
  assert.ok(urls.some((u) => /^\/edicoes\/[^/]+\/[^/]+\/$/.test(u.pathname)), 'O sitemap não tem nenhum artigo.');
  for (const u of urls) {
    assert.equal(u.origin, site.origin, `O sitemap tem ${u.href}, que não é do site ${site.origin}.`);
    assert.ok(!u.pathname.endsWith('/imprimir/'), `O sitemap tem a versão para imprimir ${u.pathname}. Repete os artigos da edição e deve ficar de fora (filtro do sitemap em astro.config.mjs).`);
    assert.ok(existe(`dist${u.pathname}index.html`), `O sitemap tem ${u.pathname}, que não existe em dist.`);
  }
  assert.ok(!ler('dist/404.html').includes('data-pagefind-body'), 'A página 404 seria indexada pela pesquisa.');
});

test('as ligações internas levam a páginas e âncoras que existem', () => {
  const ids = new Map();
  const idsDe = (ficheiro) => {
    if (!ids.has(ficheiro)) ids.set(ficheiro, new Set([...ler(ficheiro).matchAll(/\sid="([^"]+)"/g)].map(([, id]) => atributo(id))));
    return ids.get(ficheiro);
  };
  const destino = (caminho) =>
    (caminho.endsWith('/') ? [`${caminho}index.html`] : [caminho, `${caminho}.html`, `${caminho}/index.html`]).map((c) => `dist${c}`).find((c) => existe(c) && !c.endsWith('/'));
  const erros = [];
  for (const f of paginas) {
    const html = ler(`dist/${f}`);
    const ligacoes = [
      ...[...html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)].map(([, u]) => u),
      ...[...html.matchAll(/\ssrcset="([^"]*)"/g)].flatMap(([, s]) => s.split(',').map((x) => x.trim().split(/\s+/)[0])),
    ].map(atributo).filter((u) => u.startsWith('/') && !u.startsWith('//') && !u.startsWith('/pagefind/'));
    for (const u of new Set(ligacoes)) {
      const [caminho, ancora] = u.replace(/\?[^#]*/, '').split('#');
      const alvo = destino(decodificar(caminho));
      const rascunho = caminho.match(/^\/edicoes\/([^/]+)\//)?.[1];
      if (!alvo && rascunhos.has(rascunho))
        erros.push(`${fonte(f)}: a ligação ${u} leva à edição ${rascunho}, que está em rascunho e por isso não está no site. Publica essa edição primeiro (desmarca «Rascunho» no painel) ou tira a ligação.`);
      else if (!alvo) erros.push(`${fonte(f)}: a ligação ${u} leva a uma página ou ficheiro que não existe. Corrige o endereço ou carrega o ficheiro no painel.`);
      else if (ancora && alvo.endsWith('.html') && !idsDe(alvo).has(decodificar(ancora)))
        erros.push(`${fonte(f)}: a ligação ${u} aponta para #${decodificar(ancora)}, que não existe em ${caminho}. Corrige a parte depois do # na ligação.`);
    }
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('todas as imagens têm descrição, e nos artigos não pode ficar vazia', () => {
  const erros = [];
  for (const f of paginas) {
    const artigo = artigoDe(f) && !f.includes('/imprimir/');
    for (const [img] of ler(`dist/${f}`).matchAll(/<img\b[^>]*>/g)) {
      const nome = img.match(/\ssrc="([^"]*)"/)?.[1].split('/').pop().split('.')[0] ?? '(sem endereço)';
      const alt = img.match(/\salt="([^"]*)"/)?.[1];
      if (alt === undefined) erros.push(`${fonte(f)}: a imagem «${nome}» não tem descrição (alt). Escreve uma descrição curta do que a imagem mostra.`);
      else if (artigo && !alt.trim()) erros.push(`${fonte(f)}: a imagem «${nome}» tem a descrição vazia. Abre o artigo no painel e escreve o que a imagem mostra, para quem não a consegue ver.`);
    }
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('os PDFs indicados nas edições existem', () => {
  for (const e of edicoes.filter((e) => e.pdf)) {
    const pdf = e.pdf.replace(/^["']|["']$/g, '');
    assert.ok(pdf.startsWith('/') && existe(`public${pdf}`),
      `A edição src/content/edicoes/${e.id}.md tem no campo «PDF original» o ficheiro ${pdf}, que não existe em public/. Carrega o PDF no painel ou corrige o campo.`);
  }
});

test('nenhum ficheiro do site passa de 25 MiB (o limite do Cloudflare Pages)', () => {
  const limite = 25 * 1024 * 1024;
  for (const f of readdirSync(raiz + 'dist', { recursive: true })) {
    const { size } = statSync(`${raiz}dist/${f}`);
    assert.ok(size <= limite,
      `O ficheiro ${f} tem ${(size / 1024 / 1024).toFixed(1).replace(".", ",")} MiB e o Cloudflare Pages não publica ficheiros com mais de 25 MiB. Reduz o tamanho do PDF (por exemplo, com «Reduzir tamanho do ficheiro» no Acrobat ou num compressor de PDF) e carrega-o de novo no painel.`);
  }
});

test('na pesquisa, cada artigo tem os filtros de edição e secção, cada edição o de edição, e todos a data para ordenar', () => {
  const pasta = 'dist/pagefind/fragment';
  for (const f of readdirSync(raiz + pasta)) {
    const { url, filters, content, meta } = JSON.parse(gunzipSync(readFileSync(`${raiz}${pasta}/${f}`)).toString('utf8').replace(/^pagefind_dcd/, ''));
    const artigo = url.split('/').length === 5;
    assert.equal(filters.edicao?.length, 1, `${url} não tem o filtro de edição na pesquisa.`);
    assert.equal(filters.seccao?.length, artigo ? 1 : undefined, `${url} ${artigo ? 'não tem' : 'não devia ter'} o filtro de secção na pesquisa.`);
    assert.match(ler(`dist${url}index.html`), /data-pagefind-sort="data:\d{4}-\d{2}-\d{2}"/, `${url} não tem a data para ordenar os resultados da pesquisa.`);
    if (artigo) assert.ok(content.startsWith(meta.title), `O texto de ${url} na pesquisa não começa pelo título (tem a etiqueta da secção à frente?).`);
  }
});

// Largura e altura de um JPEG, lidas do marcador SOF.
function tamanhoJpeg(b) {
  for (let i = 2; i < b.length; i += 2 + b.readUInt16BE(i + 2))
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(b[i + 1])) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
}

test('cada página tem imagem de partilha, que existe em dist com o tamanho declarado', () => {
  for (const f of paginas.filter((f) => !f.startsWith('admin/') && !demonstracaoDe(f))) {
    const html = ler(`dist/${f}`);
    const meta = (p) => html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`))?.[1];
    const imagem = meta('image');
    assert.ok(imagem, `A página dist/${f} não tem imagem de partilha (og:image).`);
    const { origin, pathname } = new URL(imagem);
    assert.equal(origin, site.origin, `A imagem de partilha de dist/${f} não aponta para o site.`);
    assert.ok(existe(`dist${pathname}`), `A imagem de partilha de dist/${f} (${pathname}) não existe em dist.`);
    assert.deepEqual(tamanhoJpeg(readFileSync(`${raiz}dist${pathname}`)), [Number(meta('image:width')), Number(meta('image:height'))], `A imagem de partilha de dist/${f} não tem o tamanho declarado.`);
  }
});

test('cada página tem o endereço canónico igual ao og:url, e só a 404, o painel e as demonstrações ficam fora dos motores de busca', () => {
  const erros = [];
  for (const f of paginas) {
    const html = ler(`dist/${f}`);
    const canonico = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    const ogUrl = html.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    if (f === '404.html' || f.startsWith('admin/') || demonstracaoDe(f)) {
      if (!noindex) erros.push(`A página dist/${f} não tem <meta name="robots" content="noindex"> e seria indexada pelos motores de busca.`);
      if (canonico) erros.push(`A página dist/${f} não devia ter endereço canónico: é servida noutros endereços.`);
      continue;
    }
    if (noindex) erros.push(`${fonte(f)}: a página tem noindex e ficaria fora dos motores de busca. Só a 404, o painel e as demonstrações o podem ter.`);
    if (!canonico) { erros.push(`${fonte(f)}: a página não tem endereço canónico (<link rel="canonical">). Usa o layout Base.`); continue; }
    const url = new URL(atributo(canonico));
    if (url.origin !== site.origin) erros.push(`${fonte(f)}: o endereço canónico ${canonico} não é do site ${site.origin} (o domínio muda-se em astro.config.mjs).`);
    if (url.search || url.hash) erros.push(`${fonte(f)}: o endereço canónico ${canonico} tem ? ou #, e não devia.`);
    if (!url.pathname.endsWith('/') || !existe(`dist${decodificar(url.pathname)}index.html`)) erros.push(`${fonte(f)}: o endereço canónico ${canonico} leva a uma página que não existe.`);
    if (ogUrl !== canonico) erros.push(`${fonte(f)}: o endereço canónico (${canonico}) e o og:url (${ogUrl}) são diferentes.`);
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('cada artigo e cada edição têm dados estruturados válidos, com a capa da edição', () => {
  const erros = [];
  for (const f of paginas) {
    const html = ler(`dist/${f}`);
    const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, j]) => j);
    const artigo = artigoDe(f) && !f.includes('/imprimir/');
    const edicao = f.match(/^edicoes\/([^/]+)\/index\.html$/)?.[1];
    if (!artigo && !edicao) continue;
    if (blocos.length !== 1) { erros.push(`${fonte(f)}: a página tem ${blocos.length} blocos de dados estruturados (JSON-LD) em vez de um.`); continue; }
    if (blocos[0].includes('<')) erros.push(`${fonte(f)}: os dados estruturados têm um < por escapar, que pode partir a página.`);
    let d;
    try { d = JSON.parse(blocos[0]); } catch (e) { erros.push(`${fonte(f)}: os dados estruturados não são JSON válido (${e.message}).`); continue; }
    const falta = (campo) => erros.push(`${fonte(f)}: falta «${campo}» nos dados estruturados.`);
    const dataEdicao = edicoes.find((e) => e.id === f.split('/')[1])?.data;
    const tipo = artigo ? 'Article' : 'PublicationIssue';
    if (d['@context'] !== 'https://schema.org' || d['@type'] !== tipo) erros.push(`${fonte(f)}: os dados estruturados deviam ser do tipo ${tipo} do schema.org.`);
    if (d.datePublished !== dataEdicao) erros.push(`${fonte(f)}: a data nos dados estruturados (${d.datePublished}) não é a da edição (${dataEdicao}).`);
    if (d.url !== html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]) erros.push(`${fonte(f)}: o url nos dados estruturados (${d.url}) não é o endereço canónico.`);
    if (d.inLanguage !== 'pt-PT') falta('inLanguage: pt-PT');
    if (!d.publisher?.name) falta('publisher');
    if (artigo) {
      if (typeof d.headline !== 'string' || !d.headline.trim()) erros.push(`${fonte(f)}: o artigo não tem título nos dados estruturados. Preenche o «Título» no painel.`);
      if (d.isPartOf?.['@type'] !== 'PublicationIssue' || !existe(`dist${new URL(d.isPartOf.url).pathname}index.html`)) falta('isPartOf, com uma edição que existe');
      for (const p of d.author ?? [])
        if (p['@type'] !== 'Person' || !/^\p{Lu}/u.test(p.name ?? '')) erros.push(`${fonte(f)}: o autor «${p.name}» não parece um nome de pessoa. Escreve no campo «Autores» um nome por pessoa.`);
    }
    if (!d.image) { falta('image'); continue; }
    const imagem = new URL(d.image);
    if (imagem.origin !== site.origin || !existe(`dist${imagem.pathname}`)) erros.push(`${fonte(f)}: a imagem dos dados estruturados (${d.image}) não existe em dist.`);
    if (d.image !== html.match(/<meta property="og:image" content="([^"]*)"/)?.[1]) erros.push(`${fonte(f)}: a imagem dos dados estruturados não é a mesma do og:image.`);
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('a data de atualização dos artigos vem do git, só depois do lançamento, e o logótipo do jornal existe e é quadrado', () => {
  const erros = [];
  const logotipos = new Set();
  for (const f of paginas.filter((f) => artigoDe(f) && !f.includes('/imprimir/'))) {
    const json = ler(`dist/${f}`).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!json) continue; // a falta do bloco já é apanhada na verificação dos dados estruturados
    const d = JSON.parse(json);
    const md = ['md', 'mdx'].map((x) => `src/content/artigos/${artigoDe(f)}.${x}`).find(existe);
    const esperada = md && ultimaAtualizacao(md);
    if (d.dateModified !== esperada)
      erros.push(`${fonte(f)}: a data de atualização nos dados estruturados (${d.dateModified ?? 'nenhuma'}) não é a do último commit depois de ${LANCAMENTO} (${esperada ?? 'nenhum'}).`);
    else if (esperada && esperada < d.datePublished) erros.push(`${fonte(f)}: a data de atualização (${esperada}) é anterior à da edição (${d.datePublished}).`);
    if (d.publisher?.logo?.url) logotipos.add(d.publisher.logo.url);
    else erros.push(`${fonte(f)}: falta o logótipo do jornal (publisher.logo) nos dados estruturados.`);
  }
  for (const url of logotipos) {
    const { origin, pathname } = new URL(url);
    if (origin !== site.origin || !existe(`dist${pathname}`)) { erros.push(`O logótipo ${url} não existe em dist. Deve estar em public${pathname}.`); continue; }
    const png = readFileSync(`${raiz}dist${pathname}`);
    const [largura, altura] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (png.toString('latin1', 1, 4) !== 'PNG') erros.push(`O logótipo public${pathname} não é um PNG.`);
    else if (largura !== altura || largura < 112) erros.push(`O logótipo public${pathname} tem ${largura}×${altura}: tem de ser quadrado, com pelo menos 112 px.`);
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('o robots.txt indica o sitemap do site e não bloqueia nenhuma página do sitemap nem as que têm noindex', () => {
  assert.ok(existe('dist/robots.txt'), 'Falta o dist/robots.txt (gerado por src/pages/robots.txt.ts).');
  const linhas = ler('dist/robots.txt').split('\n').map((l) => l.replace(/#.*/, '').trim());
  const sitemaps = linhas.filter((l) => /^sitemap:/i.test(l)).map((l) => l.replace(/^sitemap:\s*/i, ''));
  assert.deepEqual(sitemaps, [`${site.origin}/sitemap-index.xml`], `O robots.txt devia indicar só o sitemap ${site.origin}/sitemap-index.xml (o domínio muda-se em astro.config.mjs).`);
  assert.ok(existe('dist/sitemap-index.xml'), 'O robots.txt indica o sitemap-index.xml, que não existe em dist.');
  const bloqueados = linhas.filter((l) => /^disallow:/i.test(l)).map((l) => l.replace(/^disallow:\s*/i, '')).filter(Boolean);
  const urls = [...ler('dist/sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => new URL(u).pathname);
  const demonstracoes = paginas.filter(demonstracaoDe).map((f) => `/${f.replace(/index\.html$/, '')}`);
  for (const caminho of [...urls, '/404.html', '/admin/', ...demonstracoes])
    for (const b of bloqueados)
      assert.ok(!caminho.startsWith(b), `O robots.txt bloqueia ${caminho} (Disallow: ${b}). As páginas do sitemap têm de poder ser lidas, e as que têm noindex também, senão o noindex não é visto.`);
});

function regrasHeaders() {
  assert.ok(existe('dist/_headers'), 'Falta o dist/_headers: o public/_headers não foi copiado.');
  const regras = [];
  for (const linha of ler('dist/_headers').split('\n')) {
    if (!linha.trim() || linha.trim().startsWith('#')) continue;
    if (!/^\s/.test(linha)) regras.push({ padrao: linha.trim(), cabecalhos: {} });
    else {
      const [, nome, valor] = linha.trim().match(/^([^:]+):\s*(.*)$/) ?? [];
      assert.ok(nome && regras.length, `O public/_headers tem uma linha que não percebo: «${linha.trim()}».`);
      regras.at(-1).cabecalhos[nome.toLowerCase()] = valor;
    }
  }
  return regras;
}

test('o _headers protege todas as páginas e só põe cache longa em ficheiros com hash no nome', () => {
  const regras = regrasHeaders();
  const todas = regras.find((r) => r.padrao === '/*')?.cabecalhos ?? {};
  for (const nome of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'content-security-policy', 'permissions-policy', 'strict-transport-security'])
    assert.ok(todas[nome], `O public/_headers não tem ${nome} na regra /* (para todas as páginas).`);
  assert.ok(!/(script|default)-src/.test(todas['content-security-policy']), 'A Content-Security-Policy no public/_headers limita os scripts: o painel (jsDelivr, unpkg) e a pesquisa (WebAssembly) deixariam de funcionar.');

  const ficheiros = readdirSync(raiz + 'dist', { recursive: true }).filter((f) => statSync(`${raiz}dist/${f}`).isFile()).map((f) => `/${f}`);
  const comHash = (f) => /\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(f);
  for (const { padrao, cabecalhos } of regras.filter((r) => r.padrao !== '/*')) {
    const re = new RegExp(`^${padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const abrangidos = ficheiros.filter((f) => re.test(f));
    assert.ok(abrangidos.length, `A regra ${padrao} do public/_headers não abrange nenhum ficheiro em dist. O endereço está bem escrito?`);
    const idade = Number(cabecalhos['cache-control']?.match(/max-age=(\d+)/)?.[1] ?? 0);
    if (idade > 86400 || /immutable/.test(cabecalhos['cache-control'] ?? ''))
      for (const f of abrangidos)
        assert.ok(comHash(f), `A regra ${padrao} do public/_headers guarda ${f} em cache por muito tempo, mas o nome não tem hash: quem visitou o site continuaria a ver a versão antiga.`);
  }
});

test('as fontes pré-carregadas são as que o CSS usa, e a capa principal da página inicial e das edições carrega primeiro', () => {
  const erros = [];
  for (const f of paginas.filter((f) => !f.startsWith('admin/') && !demonstracaoDe(f))) {
    const html = ler(`dist/${f}`);
    const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(([, h]) => ler(`dist${h}`)).join('');
    const preloads = [...html.matchAll(/<link rel="preload"[^>]*>/g)].map(([l]) => l);
    if (preloads.length !== 2) erros.push(`A página dist/${f} tem ${preloads.length} pré-carregamentos de fontes em vez de dois (src/layouts/Base.astro).`);
    for (const l of preloads) {
      const href = l.match(/\shref="([^"]+)"/)?.[1] ?? '';
      if (!/\sas="font"/.test(l) || !/\scrossorigin/.test(l)) erros.push(`O pré-carregamento de ${href} em dist/${f} precisa de as="font" e crossorigin, senão a fonte é descarregada duas vezes.`);
      if (!existe(`dist${href}`)) erros.push(`A fonte pré-carregada ${href} em dist/${f} não existe em dist.`);
      else if (!css.includes(`url(${href})`)) erros.push(`A fonte pré-carregada ${href} em dist/${f} não é a que o CSS da página usa: seria descarregada sem servir para nada.`);
    }
    if (f === 'index.html' || /^edicoes\/[^/]+\/index\.html$/.test(f)) {
      const capa = html.match(/<img\b[^>]*>/)?.[0];
      if (capa && (/loading="lazy"/.test(capa) || !/fetchpriority="high"/.test(capa)))
        erros.push(`A capa no topo de dist/${f} tem de ter loading="eager" e fetchpriority="high", para aparecer o mais cedo possível. Corrige em src/pages/index.astro ou src/pages/edicoes/[edicao]/index.astro.`);
    }
  }
  assert.ok(!erros.length, erros.join('\n'));
});

// ---- Demonstrações (src/content/demonstracoes): correm isoladas, sem rede e fora dos motores de busca.

const artigosMdx = readdirSync(raiz + 'src/content/artigos', { recursive: true }).filter((f) => /\.mdx?$/.test(f));
const demonstracoesSrc = readdirSync(raiz + 'src/content/demonstracoes').filter((f) => f.endsWith('.yml')).map((f) => f.replace(/\.yml$/, ''));
const paginasDemonstracao = paginas.filter(demonstracaoDe);
// O código da professora, sem o que o site lhe acrescenta (src/lib/demonstracoes.mjs).
const codigoDe = (html) => html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">|<script>new ResizeObserver[\s\S]*?<\/script>/g, '');

test('cada bloco «Demonstração» dos artigos usa uma demonstração que existe', () => {
  const erros = [];
  const padraoBloco = new RegExp(blocoDemonstracao.pattern.source, 'gm');
  for (const f of artigosMdx) {
    const texto = ler(`src/content/artigos/${f}`);
    const blocos = [...texto.matchAll(padraoBloco)];
    if ((texto.match(/<Demonstracao\b/g) ?? []).length !== blocos.length)
      erros.push(`No artigo src/content/artigos/${f}: há um <Demonstracao> escrito à mão que o painel não reconhece. Apaga-o e insere-o outra vez com Inserir → Demonstração.`);
    for (const { groups: { id } } of blocos)
      if (!demonstracoesSrc.includes(id))
        erros.push(`No artigo src/content/artigos/${f}: o bloco «Demonstração» usa «${id}», que não existe. Escolhe outra no bloco, ou cria-a em «Demonstrações» no painel.`);
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('cada demonstração é pequena, só carrega bibliotecas aprovadas e não usa o que está bloqueado', () => {
  assert.deepEqual(paginasDemonstracao.map(demonstracaoDe).toSorted(), demonstracoesSrc.toSorted(), 'Há demonstrações em src/content/demonstracoes sem página em dist, ou o contrário.');
  const bloqueados = [
    [/\b(alert|confirm|prompt)\s*\(/, (x) => `${x}(), que está bloqueado nas demonstrações e não mostra nada. Escreve a mensagem num parágrafo da página`],
    [/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/, (x) => `${x}, que não funciona nas demonstrações (estão isoladas do resto do site). Tira essa parte, ou pede à IA uma versão que não guarde nada no browser`],
    [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|\bwindow\.open\s*\(/, (x) => `${x.replace(/\s*\($/, '()')}, que está bloqueado: as demonstrações não podem contactar outros sites nem abrir janelas`],
  ];
  const erros = [];
  for (const f of paginasDemonstracao) {
    const codigo = codigoDe(ler(`dist/${f}`));
    const onde = fonte(f);
    const tamanho = Buffer.byteLength(codigo);
    if (tamanho > TAMANHO_MAXIMO) erros.push(`${onde}: o código tem ${Math.round(tamanho / 1000)} KB; o máximo é ${TAMANHO_MAXIMO / 1000} KB. Imagens metidas no código (data:) ocupam muito: desenha-as com o canvas ou tira-as.`);
    const enderecos = [
      ...codigo.matchAll(/\s(?:src|href|action|data|poster)\s*=\s*["']([^"']*)["']/gi),
      ...codigo.matchAll(/url\(\s*["']?([^"')]+)/gi),
      ...codigo.matchAll(/@import\s+["']([^"']+)/gi),
      ...codigo.matchAll(/\bimport\s*\(?\s*(?:[\w{}\s,*]+from\s*)?["']([^"']+)["']/g),
    ].map(([, u]) => u.trim());
    for (const u of new Set(enderecos))
      if (!/^(data:|blob:|#)/.test(u) && !BIBLIOTECAS.some((b) => u.startsWith(b)))
        erros.push(`${onde}: o código usa ${u}, que não está na lista de bibliotecas aprovadas e não vai carregar. As demonstrações só podem carregar ${BIBLIOTECAS.map((b) => `${b}…`).join(' ou ')} (guia, secção «Demonstrações»); para outra, fala com o Miguel.`);
    for (const [re, mensagem] of bloqueados) {
      const m = codigo.match(re);
      if (m) erros.push(`${onde}: o código usa ${mensagem(m[1] ?? m[0])}.`);
    }
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('os iframes do site têm título, e os das demonstrações estão isolados (sandbox sem allow-same-origin)', () => {
  const erros = [];
  for (const f of paginas.filter((f) => !demonstracaoDe(f))) {
    for (const [iframe] of ler(`dist/${f}`).matchAll(/<iframe\b[^>]*>/g)) {
      const attr = (nome) => iframe.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];
      const src = atributo(attr('src') ?? '');
      if (!attr('title')?.trim()) erros.push(`${fonte(f)}: o iframe ${src} não tem título (title). Quem usa um leitor de ecrã não saberia o que é.`);
      const id = src.match(/^\/demonstracoes\/([^/]+)\/$/)?.[1];
      if (!id) erros.push(`${fonte(f)}: há um <iframe> de ${src || '(sem endereço)'}. Os conteúdos de outros sites só entram pelo bloco «Applet GeoGebra», e as demonstrações pelo bloco «Demonstração».`);
      else if (attr('sandbox') !== 'allow-scripts')
        erros.push(`No código do site (src/components/Demonstracao.astro), página dist/${f}: o iframe ${src} tem sandbox="${attr('sandbox') ?? ''}" em vez de sandbox="allow-scripts". Sem sandbox, ou com allow-same-origin, a demonstração podia ler a sessão do painel e o progresso dos alunos.`);
      else if (!existe(`dist${src}index.html`)) erros.push(`${fonte(f)}: o iframe leva à demonstração «${id}», que não existe em dist.`);
    }
  }
  assert.ok(!erros.length, erros.join('\n'));
});

test('as páginas das demonstrações começam pela CSP, têm noindex e ficam fora do sitemap, e o _headers isola-as', () => {
  const erros = [];
  const sitemap = ler('dist/sitemap-0.xml');
  for (const f of paginasDemonstracao) {
    const html = ler(`dist/${f}`);
    const csp = html.match(/<head\b[^>]*>\s*<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)?.[1];
    if (csp !== CSP) erros.push(`A página dist/${f} não começa pela Content-Security-Policy de src/lib/demonstracoes.mjs: sem ela, a demonstração podia carregar código de qualquer site. Corrige a função pagina() em src/lib/demonstracoes.mjs.`);
    if (!/<meta name="robots" content="noindex">/.test(html)) erros.push(`A página dist/${f} não tem <meta name="robots" content="noindex"> (função pagina() em src/lib/demonstracoes.mjs).`);
    if (sitemap.includes(`/${f.replace(/index\.html$/, '')}`)) erros.push(`A demonstração dist/${f} está no sitemap. Deve ficar de fora (filtro do sitemap em astro.config.mjs).`);
  }
  const regra = regrasHeaders().find((r) => r.padrao === '/demonstracoes/*')?.cabecalhos ?? {};
  const politica = regra['content-security-policy'] ?? '';
  if (!/(^|;)\s*sandbox allow-scripts\s*(;|$)/.test(politica) || /allow-same-origin/.test(politica))
    erros.push(`O public/_headers tem de ter, na regra /demonstracoes/*, «Content-Security-Policy: sandbox allow-scripts; …» (sem allow-same-origin). Sem isso, quem abrir a demonstração fora do artigo corre o código dela no site, com acesso à sessão do painel.`);
  if (!/connect-src 'none'/.test(politica)) erros.push(`O public/_headers tem de ter connect-src 'none' na CSP da regra /demonstracoes/*.`);
  if (!/noindex/.test(regra['x-robots-tag'] ?? '')) erros.push('O public/_headers tem de ter «X-Robots-Tag: noindex» na regra /demonstracoes/*.');
  assert.ok(!erros.length, erros.join('\n'));
});

test('cada applet GeoGebra tem uma ligação válida, título e altura, e só contacta o GeoGebra depois do clique', () => {
  const erros = [];
  const padraoBloco = new RegExp(appletGeoGebra.pattern.source, 'gm');
  for (const f of artigosMdx) {
    const texto = ler(`src/content/artigos/${f}`);
    const blocos = [...texto.matchAll(padraoBloco)];
    if ((texto.match(/<GeoGebra\b/g) ?? []).length !== blocos.length)
      erros.push(`No artigo src/content/artigos/${f}: há um <GeoGebra> escrito à mão que o painel não reconhece. Apaga-o e insere-o outra vez com Inserir → Applet GeoGebra.`);
    for (const m of blocos) {
      const { ligacao, titulo, altura } = appletGeoGebra.fromBlock(m);
      if (!geogebra(ligacao, altura))
        erros.push(`No artigo src/content/artigos/${f}: a ligação «${ligacao}» do bloco «Applet GeoGebra» não é a de um applet. No GeoGebra, abre o applet, carrega em «Partilhar» e copia a ligação (https://www.geogebra.org/m/…).`);
      if (!titulo.trim()) erros.push(`No artigo src/content/artigos/${f}: o applet GeoGebra ${ligacao} não tem título. Escreve no bloco o que o applet mostra; é o que os leitores de ecrã anunciam.`);
      if (!(Number.isInteger(altura) && altura >= 250 && altura <= 900))
        erros.push(`No artigo src/content/artigos/${f}: a altura do applet GeoGebra ${ligacao} é ${altura}; tem de ser um número inteiro entre 250 e 900.`);
    }
  }
  for (const f of paginas)
    for (const [el] of ler(`dist/${f}`).matchAll(/<maismat-geogebra\b[^>]*>/g)) {
      const src = atributo(el.match(/\sdata-src="([^"]*)"/)?.[1] ?? '');
      if (!/^https:\/\/www\.geogebra\.org\/material\/iframe\/id\/[A-Za-z0-9]{8}\//.test(src))
        erros.push(`No código do site (src/components/GeoGebra.astro), página dist/${f}: o botão do applet abriria ${src || '(nada)'}, que não é um applet do GeoGebra.`);
      if (!el.match(/\sdata-titulo="([^"]*)"/)?.[1].trim()) erros.push(`${fonte(f)}: o applet GeoGebra ${src} não tem título.`);
    }
  assert.ok(!erros.length, erros.join('\n'));
});
