// Dados estruturados (JSON-LD, schema.org) para os motores de busca.
import { rotuloEdicao, type Edicao } from './edicoes';

const JORNAL = '+MAT — Jornal de Matemática';

export const dia = (d: Date) => d.toISOString().slice(0, 10);

export const editora = (site: URL) => ({
  '@type': 'Organization',
  name: JORNAL,
  url: site.href,
  parentOrganization: { '@type': 'EducationalOrganization', name: 'Agrupamento de Escolas Domingos Sequeira' },
});

export const numeroEdicao = (e: Edicao, site: URL) => ({
  '@type': 'PublicationIssue',
  name: rotuloEdicao(e),
  issueNumber: e.data.numero,
  datePublished: dia(e.data.data),
  url: new URL(`/edicoes/${e.id}/`, site).href,
  isPartOf: {
    '@type': 'PublicationVolume',
    volumeNumber: e.data.ano,
    isPartOf: { '@type': 'Periodical', name: JORNAL, url: site.href },
  },
});

// "Professora Ana Olival", "Pedro Lebre e Luís Silva (12.º E)" -> um nome por pessoa; "vários alunos" fica de fora.
export const pessoas = (autores: string[] = []) =>
  autores
    .flatMap((a) => a.replace(/\s*\([^)]*\)/g, '').split(/\s+e\s+/))
    .map((n) => n.replace(/^Professora?\s+/, '').trim())
    .filter((n) => /^\p{Lu}/u.test(n))
    .map((name) => ({ '@type': 'Person', name }));

// Dentro de <script>, um "</script>" num título fecharia o bloco: <, > e & vão como \u003c, \u003e e \u0026.
export const jsonLd = (dados: object) =>
  JSON.stringify(dados).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
