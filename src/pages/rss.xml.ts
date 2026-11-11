import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { artigosDe, edicoesOrdenadas, mesAno, rotuloEdicao } from '../lib/edicoes';

// Uma entrada por edição publicada, da mais recente para a mais antiga.
export async function GET(context: APIContext) {
  const edicoes = await edicoesOrdenadas();
  return rss({
    title: '+MAT · Jornal de Matemática',
    description: 'Edições do +MAT, jornal de Matemática do Agrupamento de Escolas Domingos Sequeira, Leiria.',
    site: context.site!,
    customData: '<language>pt-PT</language>',
    items: await Promise.all(
      edicoes.map(async (e) => {
        const artigos = await artigosDe(e.id);
        return {
          title: `${rotuloEdicao(e)} (${mesAno(e.data.data)})`,
          pubDate: e.data.data,
          link: `/edicoes/${e.id}/`,
          description: artigos.length
            ? `Nesta edição: ${artigos.map((a) => a.data.titulo).join(' · ')}.`
            : 'Edição disponível no formato original em PDF.',
        };
      }),
    ),
  });
}
