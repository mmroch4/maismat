import { getCollection, type CollectionEntry } from 'astro:content';

export type Edicao = CollectionEntry<'edicoes'>;
export type Artigo = CollectionEntry<'artigos'>;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const mesAno = (d: Date) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const rotuloEdicao = (e: Edicao) => `Ano ${e.data.ano} · Edição ${String(e.data.numero).padStart(2, '0')}`;

export async function edicoesOrdenadas() {
  const todas = await getCollection('edicoes');
  return todas.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}

export async function artigosDe(edicaoId: string) {
  const artigos = await getCollection('artigos', (a) => a.data.edicao.id === edicaoId);
  return artigos.sort((a, b) => a.data.ordem - b.data.ordem);
}

// "a3-n3/01-geometria" -> "01-geometria"
export const slugArtigo = (a: Artigo) => a.id.split('/').pop()!;
