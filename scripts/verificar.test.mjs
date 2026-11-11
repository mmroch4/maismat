// Verificações depois do build (`npm run build` corre-as no fim; à parte: `npm run verificar`).
// Apanham os enganos que o painel não impede: respostas impossíveis, ids repetidos, respostas à vista, rascunhos publicados.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { desafio as bloco } from '../public/admin/componentes.js';
import { codificar, codigoDaLigacao, descodificar, ligacaoProgresso } from '../src/lib/progresso.mjs';
import { normalizar } from '../src/lib/respostas.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
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
  const ligacao = ligacaoProgresso('https://maismat.miguelrocha.dev', ids);
  assert.match(ligacao, /^https:\/\/maismat\.miguelrocha\.dev\/desafios\/#progresso=MAT1-[0-9A-Z]+$/);
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
function fonte(f) {
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
      if (!alvo) erros.push(`${fonte(f)}: a ligação ${u} leva a uma página ou ficheiro que não existe. Corrige o endereço ou carrega o ficheiro no painel.`);
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

test('na pesquisa, cada artigo tem os filtros de edição e secção, e cada edição o de edição', () => {
  const pasta = 'dist/pagefind/fragment';
  for (const f of readdirSync(raiz + pasta)) {
    const { url, filters } = JSON.parse(gunzipSync(readFileSync(`${raiz}${pasta}/${f}`)).toString('utf8').replace(/^pagefind_dcd/, ''));
    const artigo = url.split('/').length === 5;
    assert.equal(filters.edicao?.length, 1, `${url} não tem o filtro de edição na pesquisa.`);
    assert.equal(filters.seccao?.length, artigo ? 1 : undefined, `${url} ${artigo ? 'não tem' : 'não devia ter'} o filtro de secção na pesquisa.`);
  }
});

// Largura e altura de um JPEG, lidas do marcador SOF.
function tamanhoJpeg(b) {
  for (let i = 2; i < b.length; i += 2 + b.readUInt16BE(i + 2))
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(b[i + 1])) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
}

test('cada página tem imagem de partilha, que existe em dist com o tamanho declarado', () => {
  for (const f of paginas.filter((f) => !f.startsWith('admin/'))) {
    const html = ler(`dist/${f}`);
    const meta = (p) => html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`))?.[1];
    const imagem = meta('image');
    assert.ok(imagem, `A página dist/${f} não tem imagem de partilha (og:image).`);
    const { origin, pathname } = new URL(imagem);
    assert.equal(origin, 'https://maismat.miguelrocha.dev', `A imagem de partilha de dist/${f} não aponta para o site.`);
    assert.ok(existe(`dist${pathname}`), `A imagem de partilha de dist/${f} (${pathname}) não existe em dist.`);
    assert.deepEqual(tamanhoJpeg(readFileSync(`${raiz}dist${pathname}`)), [Number(meta('image:width')), Number(meta('image:height'))], `A imagem de partilha de dist/${f} não tem o tamanho declarado.`);
  }
});
