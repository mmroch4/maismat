import { getCollection, type CollectionEntry } from 'astro:content';

export type Edicao = CollectionEntry<'edicoes'>;
export type Artigo = CollectionEntry<'artigos'>;

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const mesAno = (d: Date) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const rotuloEdicao = (e: Edicao) => `Ano ${e.data.ano} · Edição ${String(e.data.numero).padStart(2, '0')}`;

// Edições em rascunho e os seus artigos ficam fora do site.
// As páginas devem usar estas funções em vez de getCollection.
export const edicoesPublicadas = () => getCollection('edicoes', (e) => !e.data.rascunho);

export async function artigosPublicados(filtro: (a: Artigo) => boolean = () => true) {
  const ids = new Set((await edicoesPublicadas()).map((e) => e.id));
  return getCollection('artigos', (a) => ids.has(a.data.edicao.id) && filtro(a));
}

export async function edicoesOrdenadas() {
  const todas = await edicoesPublicadas();
  return todas.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}

// A edição que o site apresenta como atual: a mais recente já convertida para a versão digital.
export async function edicaoAtual() {
  const edicoes = await edicoesOrdenadas();
  return edicoes.find((e) => e.data.convertida) ?? edicoes[0];
}

export async function artigosDe(edicaoId: string) {
  const artigos = await artigosPublicados((a) => a.data.edicao.id === edicaoId);
  return artigos.sort((a, b) => a.data.ordem - b.data.ordem);
}

// "a3-n3/01-geometria" -> "01-geometria"
export const slugArtigo = (a: Artigo) => a.id.split('/').pop()!;
