import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getIssueArticles, getSortedIssues, monthYear, issueLabel } from '../lib/issues';

// One entry per published issue, newest first.
export async function GET(context: APIContext) {
  const issues = await getSortedIssues();
  return rss({
    title: '+MAT · Jornal de Matemática',
    description: 'Edições do +MAT, jornal de Matemática do Agrupamento de Escolas Domingos Sequeira, Leiria.',
    site: context.site!,
    customData: '<language>pt-PT</language>',
    items: await Promise.all(
      issues.map(async (issue) => {
        const articles = await getIssueArticles(issue.id);
        return {
          title: `${issueLabel(issue)} (${monthYear(issue.data.data)})`,
          pubDate: issue.data.data,
          link: `/edicoes/${issue.id}/`,
          description: articles.length
            ? `Nesta edição: ${articles.map((article) => article.data.titulo).join(' · ')}.`
            : 'Edição disponível no formato original em PDF.',
        };
      }),
    ),
  });
}
