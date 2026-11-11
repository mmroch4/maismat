// Secções fixas do jornal. A ordem aqui é a ordem usada nos filtros.
export const SECCOES = {
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

export type Seccao = keyof typeof SECCOES;
export const SECCAO_IDS = Object.keys(SECCOES) as [Seccao, ...Seccao[]];
