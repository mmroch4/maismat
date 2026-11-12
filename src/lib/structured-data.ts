// Structured data (JSON-LD, schema.org) for search engines.
import { issueLabel, type Issue } from './issues.ts';

const NEWSPAPER = '+MAT — Jornal de Matemática';

/** YYYY-MM-DD */
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const publisher = (site: URL) => ({
  '@type': 'Organization',
  name: NEWSPAPER,
  url: site.href,
  logo: { '@type': 'ImageObject', url: new URL('/logotipo.png', site).href, width: 512, height: 512 },
  parentOrganization: { '@type': 'EducationalOrganization', name: 'Agrupamento de Escolas Domingos Sequeira' },
});

export const publicationIssue = (issue: Issue, site: URL) => ({
  '@type': 'PublicationIssue',
  name: issueLabel(issue),
  issueNumber: issue.data.numero,
  datePublished: isoDay(issue.data.data),
  url: new URL(`/edicoes/${issue.id}/`, site).href,
  isPartOf: {
    '@type': 'PublicationVolume',
    volumeNumber: issue.data.ano,
    isPartOf: { '@type': 'Periodical', name: NEWSPAPER, url: site.href },
  },
});

// "Professora Ana Olival", "Pedro Lebre e Luís Silva (12.º E)" -> one name per person; "vários alunos" is left out.
export const persons = (authors: string[] = []) =>
  authors
    .flatMap((author) => author.replace(/\s*\([^)]*\)/g, '').split(/\s+e\s+/))
    .map((name) => name.replace(/^Professora?\s+/, '').trim())
    .filter((name) => /^\p{Lu}/u.test(name))
    .map((name) => ({ '@type': 'Person', name }));

// Inside <script>, a "</script>" in a title would close the block: <, > and & are written as \u003c, \u003e and \u0026.
export const jsonLd = (data: object) =>
  JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
