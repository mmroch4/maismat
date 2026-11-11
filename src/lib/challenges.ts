import katex from 'katex';
// The same <Desafio> reader the editing panel uses, tested against every article.
import { desafio as challengeBlock } from '../../public/admin/componentes.js';
import { articleSlug, getIssueArticles, getSortedIssues, type Article, type Issue } from './issues.ts';

export type Segment = { text: string } | { html: string };

export interface ArchivedChallenge {
  id: string;
  title: string;
  number: string;
  issue: Issue;
  article: Article;
  url: string;
  hasAnswer: boolean;
  hasSolution: boolean;
  excerpt: Segment[];
}

const stripMarkdown = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:\|.*|[-*>]\s+|#+\s+|\d+\.\s+)/gm, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|(?<!\\)[*_]/g, '')
    .replace(/\\([*_$\\])/g, '$1');

// The first sentences of the statement as plain text, with short formulas ($…$) rendered by KaTeX.
// Display formulas ($$…$$), images and tables are left out.
function excerpt(statement: string, maxLength = 180): Segment[] {
  const source = statement.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  const segments: Segment[] = [];
  let length = 0;
  for (const [i, part] of source.split(/(?<!\\)\$([^$\n]+?)\$/).entries()) {
    if (i % 2) {
      if (length + part.length > maxLength) break;
      segments.push({ html: katex.renderToString(part, { throwOnError: false, strict: false }) });
      length += part.length;
      continue;
    }
    const text = stripMarkdown(part).replace(/\s+/g, ' ');
    if (length + text.length <= maxLength) {
      segments.push({ text });
      length += text.length;
      continue;
    }
    const cut = text
      .slice(0, maxLength - length)
      .replace(/\s+\S*$/, '')
      .replace(/[,;:]$/, '');
    segments.push({ text: `${cut}…` });
    return trimSegments(segments);
  }
  return trimSegments(segments);
}

function trimSegments(segments: Segment[]) {
  const first = segments[0];
  const last = segments.at(-1);
  if (first && 'text' in first) first.text = first.text.trimStart();
  if (last && 'text' in last) last.text = last.text.trimEnd();
  return segments.filter((segment) => !('text' in segment) || segment.text);
}

// Every challenge of the published issues, from the newest issue to the oldest and,
// within each issue, in the order of the articles and of the text.
export async function getPublishedChallenges(): Promise<ArchivedChallenge[]> {
  const pattern = new RegExp(challengeBlock.pattern.source, 'gm');
  const challenges: ArchivedChallenge[] = [];
  const titles = new Map<string, string>();
  for (const issue of await getSortedIssues()) {
    for (const article of await getIssueArticles(issue.id)) {
      for (const match of (article.body ?? '').matchAll(pattern)) {
        const challenge = challengeBlock.fromBlock(match);
        const id = challenge.id;
        if (!id)
          throw new Error(
            `The challenge “${challenge.titulo}” (${article.id}) has no id. Open it in the panel and save it, or write id="desafio-…" in the article.`,
          );
        // The same id may only repeat when it is the same problem published again (for example, in the solutions).
        if (titles.has(id) && titles.get(id) !== challenge.titulo)
          throw new Error(
            `The challenges “${titles.get(id)}” and “${challenge.titulo}” (${article.id}) share the id ${id}. If they are different problems, clear the «Identificador» of one of them in the panel to generate a new one.`,
          );
        titles.set(id, challenge.titulo);
        challenges.push({
          id,
          title: challenge.titulo,
          number: challenge.numero,
          issue,
          article,
          url: `/edicoes/${issue.id}/${articleSlug(article)}/#${id}`,
          hasAnswer: Boolean(challenge.resposta),
          hasSolution: Boolean(challenge.resolucao),
          excerpt: excerpt(challenge.enunciado),
        });
      }
    }
  }
  return challenges;
}
