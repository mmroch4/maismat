// The newspaper's fixed sections. The keys are the ids used in the articles and in the URLs
// (/seccoes/<id>/), so they stay in Portuguese; the values are the labels shown to readers.
// The order here is the order used in the filters.
export const SECTIONS = {
  destaque: 'Em destaque',
  curiosidades: 'Curiosidades',
  historia: 'História',
  geometria: 'Geometria',
  combinatoria: 'Combinatória',
  probabilidades: 'Probabilidades',
  estatistica: 'Estatística',
  literatura: 'Literatura',
  jogo: 'Jogo',
  'trabalhos-alunos': 'Trabalhos de alunos',
  noticias: 'Notícias',
  desafios: 'Desafios',
  resolucoes: 'Resoluções',
  sugestoes: 'Sugestões',
} as const;

export type SectionId = keyof typeof SECTIONS;
export const SECTION_IDS = Object.keys(SECTIONS) as [SectionId, ...SectionId[]];
