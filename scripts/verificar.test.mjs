// Verificações depois do build (`npm run build` corre-as no fim; à parte: `npm run verificar`).
// Apanham os enganos que o painel não impede: respostas impossíveis, ids repetidos, respostas à vista, rascunhos publicados.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { desafio as bloco } from '../public/admin/componentes.js';
import { codificar, descodificar } from '../src/lib/progresso.mjs';
import { normalizar } from '../src/lib/respostas.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho) => readFileSync(raiz + caminho, 'utf8');
const existe = (caminho) => existsSync(raiz + caminho);

const frontmatter = (texto) =>
  Object.fromEntries([...(texto.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^(\w+):[ \t]*(.*)$/gm)].map(([, k, v]) => [k, v.trim()]));

const rascunhos = new Set(
  readdirSync(raiz + 'src/content/edicoes')
    .filter((f) => f.endsWith('.md') && frontmatter(ler(`src/content/edicoes/${f}`)).rascunho === 'true')
    .map((f) => f.replace(/\.md$/, '')),
);

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
