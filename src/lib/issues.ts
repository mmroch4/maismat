import { getCollection, type CollectionEntry } from 'astro:content';

export type Issue = CollectionEntry<'issues'>;
export type Article = CollectionEntry<'articles'>;

const MONTHS = [
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

/** "novembro 2022" */
export const monthYear = (date: Date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
/** "Ano 1 · Edição 01" */
export const issueLabel = (issue: Issue) =>
  `Ano ${issue.data.year} · Edição ${String(issue.data.number).padStart(2, '0')}`;

// Draft issues and their articles stay out of the site.
// Pages must use these functions instead of getCollection.
export const getPublishedIssues = () => getCollection('issues', (issue) => !issue.data.draft);

export async function getPublishedArticles(filter: (article: Article) => boolean = () => true) {
  const ids = new Set((await getPublishedIssues()).map((issue) => issue.id));
  return getCollection('articles', (article) => ids.has(article.data.issue.id) && filter(article));
}

/** Published issues, newest first. */
export async function getSortedIssues() {
  const issues = await getPublishedIssues();
  return issues.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

// The issue the site presents as current: the newest one already converted to the digital version.
export async function getCurrentIssue() {
  const issues = await getSortedIssues();
  return issues.find((issue) => issue.data.converted) ?? issues[0];
}

/** The published articles of an issue, in reading order. */
export async function getIssueArticles(issueId: string) {
  const articles = await getPublishedArticles((article) => article.data.issue.id === issueId);
  return articles.sort((a, b) => a.data.order - b.data.order);
}

// "ano1-edicao1/01-geometria" -> "01-geometria"
export const articleSlug = (article: Article) => article.id.split('/').pop()!;
