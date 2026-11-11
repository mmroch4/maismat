import { createHash } from 'node:crypto';
import katex from 'katex';
// O mesmo leitor de <Desafio> que o painel de edição usa, testado contra todos os artigos.
import { desafio as blocoDesafio } from '../../public/admin/componentes.js';
import { artigosDe, edicoesOrdenadas, slugArtigo, type Artigo, type Edicao } from './edicoes';

// Tem de ser igual ao id usado em Desafio.astro: é a âncora no artigo e a chave no localStorage.
export const idDesafio = (titulo: string) => `desafio-${createHash('sha1').update(titulo).digest('hex').slice(0, 8)}`;

export type Segmento = { texto: string } | { html: string };

export interface DesafioArquivo {
  id: string;
  titulo: string;
  numero: string;
  edicao: Edicao;
  artigo: Artigo;
  url: string;
  temResposta: boolean;
  temResolucao: boolean;
  excerto: Segmento[];
}

const limparMarkdown = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:\|.*|[-*>]\s+|#+\s+|\d+\.\s+)/gm, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|(?<!\\)[*_]/g, '')
    .replace(/\\([*_$\\])/g, '$1');

// Primeiras frases do enunciado em texto simples, com as fórmulas curtas ($…$) em KaTeX.
// As fórmulas em destaque ($$…$$), imagens e tabelas ficam de fora.
function excerto(enunciado: string, max = 180): Segmento[] {
  const fonte = enunciado.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  const segmentos: Segmento[] = [];
  let total = 0;
  for (const [i, parte] of fonte.split(/(?<!\\)\$([^$\n]+?)\$/).entries()) {
    if (i % 2) {
      if (total + parte.length > max) break;
      segmentos.push({ html: katex.renderToString(parte, { throwOnError: false, strict: false }) });
      total += parte.length;
      continue;
    }
    const texto = limparMarkdown(parte).replace(/\s+/g, ' ');
    if (total + texto.length <= max) {
      segmentos.push({ texto });
      total += texto.length;
      continue;
    }
    const corte = texto.slice(0, max - total).replace(/\s+\S*$/, '').replace(/[,;:]$/, '');
    segmentos.push({ texto: `${corte}…` });
    return aparar(segmentos);
  }
  return aparar(segmentos);
}

function aparar(segmentos: Segmento[]) {
  const primeiro = segmentos[0];
  const ultimo = segmentos.at(-1);
  if (primeiro && 'texto' in primeiro) primeiro.texto = primeiro.texto.trimStart();
  if (ultimo && 'texto' in ultimo) ultimo.texto = ultimo.texto.trimEnd();
  return segmentos.filter((s) => !('texto' in s) || s.texto);
}

// Todos os desafios das edições publicadas, da edição mais recente para a mais antiga
// e, dentro de cada edição, pela ordem dos artigos e do texto.
export async function desafiosPublicados(): Promise<DesafioArquivo[]> {
  const padrao = new RegExp(blocoDesafio.pattern.source, 'gm');
  const lista: DesafioArquivo[] = [];
  for (const edicao of await edicoesOrdenadas()) {
    for (const artigo of await artigosDe(edicao.id)) {
      for (const m of (artigo.body ?? '').matchAll(padrao)) {
        const d = blocoDesafio.fromBlock(m);
        const id = idDesafio(d.titulo);
        lista.push({
          id,
          titulo: d.titulo,
          numero: d.numero,
          edicao,
          artigo,
          url: `/edicoes/${edicao.id}/${slugArtigo(artigo)}/#${id}`,
          temResposta: Boolean(d.resposta),
          temResolucao: Boolean(d.resolucao),
          excerto: excerto(d.enunciado),
        });
      }
    }
  }
  return lista;
}
