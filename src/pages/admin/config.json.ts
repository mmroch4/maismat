// Configuração do painel de edição (Sveltia CMS), gerada no build para que as secções venham de seccoes.ts.
// Os campos espelham os schemas de src/content.config.ts: se mudares um, muda o outro.
import type { APIRoute } from 'astro';
import { SECCOES } from '../../lib/seccoes';

const citacao = {
  name: 'citacao',
  label: 'Citação',
  widget: 'object',
  required: false,
  collapsed: true,
  hint: 'Opcional. Frase em destaque no início.',
  fields: [
    { name: 'texto', label: 'Texto' },
    { name: 'autor', label: 'Autor' },
  ],
};

const config = {
  backend: {
    name: 'github',
    // TODO(Miguel): confirmar repositório, ramo e endereço do autenticador antes de publicar.
    repo: 'miguelrocha/maismat',
    branch: 'main',
    base_url: 'https://maismat-cms-auth.miguelrocha.workers.dev',
    commit_messages: {
      create: 'Criar {{collection}} “{{slug}}”',
      update: 'Atualizar {{collection}} “{{slug}}”',
      delete: 'Apagar {{collection}} “{{slug}}”',
      uploadMedia: 'Carregar “{{path}}”',
      deleteMedia: 'Apagar “{{path}}”',
    },
  },
  media_folder: 'public/img',
  public_folder: '/img',
  collections: [
    {
      name: 'edicoes',
      label: 'Edições',
      label_singular: 'Edição',
      description: 'Cada edição do jornal. Cria a edição primeiro e só depois os artigos.',
      folder: 'src/content/edicoes',
      extension: 'md',
      format: 'frontmatter',
      create: true,
      slug: 'ano{{ano}}-edicao{{numero}}',
      identifier_field: 'numero',
      summary: "Ano {{ano}} · Edição {{numero}}{{rascunho | ternary(' · rascunho', '')}}",
      sortable_fields: { fields: ['data', 'ano', 'numero'], default: { field: 'data', direction: 'descending' } },
      fields: [
        {
          name: 'rascunho',
          label: 'Rascunho (escondida do site)',
          widget: 'boolean',
          default: true,
          hint: 'Enquanto estiver ligado, nem a edição nem os seus artigos aparecem no site. Desliga quando estiver tudo pronto: a edição inteira fica visível de uma vez.',
        },
        { name: 'ano', label: 'Ano do jornal', widget: 'number', value_type: 'int', min: 1, hint: 'Ano de publicação do +MAT (1, 2, 3, …), não o ano civil.' },
        { name: 'numero', label: 'Número da edição', widget: 'number', value_type: 'int', min: 1, hint: 'Número da edição dentro desse ano (1, 2 ou 3).' },
        { name: 'data', label: 'Data de publicação', widget: 'datetime', time_format: false, format: 'YYYY-MM-DD' },
        {
          name: 'direcao',
          label: 'Direção e edição',
          widget: 'list',
          default: ['Rosa Bértolo', 'Carla Nunes'],
          field: { name: 'nome', label: 'Nome', widget: 'string' },
        },
        {
          name: 'capa',
          label: 'Capa',
          widget: 'image',
          required: false,
          media_folder: '/src/assets/capas',
          public_folder: '../../assets/capas',
          hint: 'Imagem da primeira página (JPG).',
        },
        {
          name: 'pdf',
          label: 'PDF original',
          widget: 'file',
          required: false,
          media_folder: '/public/pdf',
          public_folder: '/pdf',
          accept: 'application/pdf',
        },
        citacao,
        {
          name: 'convertida',
          label: 'Versão digital pronta',
          widget: 'boolean',
          default: true,
          hint: 'Desliga se a edição só tiver o PDF (sem artigos).',
        },
      ],
    },
    {
      name: 'artigos',
      label: 'Artigos',
      label_singular: 'Artigo',
      description: 'Os artigos de cada edição. Escolhe a edição no primeiro campo.',
      folder: 'src/content/artigos',
      extension: 'mdx',
      format: 'frontmatter',
      create: true,
      path: '{{edicao}}/{{slug}}',
      slug: '{{titulo}}',
      identifier_field: 'titulo',
      summary: '{{ordem}}. {{titulo}}',
      media_folder: '/src/content/artigos/{{dirname}}/img',
      public_folder: './img',
      sortable_fields: { fields: ['edicao', 'ordem', 'titulo'], default: { field: 'ordem' } },
      view_groups: { groups: [{ name: 'edicao', label: 'Edição', field: 'edicao' }], default: 'edicao' },
      view_filters: {
        filters: Object.entries(SECCOES).map(([id, nome]) => ({ name: id, label: nome, field: 'seccao', pattern: `^${id}$` })),
      },
      fields: [
        { name: 'titulo', label: 'Título' },
        {
          name: 'edicao',
          label: 'Edição',
          widget: 'relation',
          collection: 'edicoes',
          value_field: '{{slug}}',
          search_fields: ['ano', 'numero'],
          display_fields: ['Ano {{ano}} · Edição {{numero}}'],
        },
        {
          name: 'seccao',
          label: 'Secção',
          widget: 'select',
          options: Object.entries(SECCOES).map(([value, label]) => ({ value, label })),
        },
        { name: 'ordem', label: 'Ordem na edição', widget: 'number', value_type: 'int', min: 1, hint: '1 para o primeiro artigo, 2 para o segundo, …' },
        {
          name: 'autores',
          label: 'Autores',
          widget: 'list',
          required: false,
          hint: 'Opcional. Um nome por linha (por exemplo, alunos de uma turma).',
          field: { name: 'nome', label: 'Nome', widget: 'string' },
        },
        { name: 'resumo', label: 'Resumo', widget: 'text', required: false, hint: 'Uma ou duas frases que aparecem na lista de artigos.' },
        { name: 'nivel', label: 'Nível', required: false, hint: 'Opcional, por exemplo “3.º ciclo”.' },
        citacao,
        {
          name: 'body',
          label: 'Texto do artigo',
          widget: 'richtext',
          editor_components: ['image', 'formula', 'formula-destaque', 'desafio', 'galeria', 'nota', 'detalhes', 'interativo'],
          hint: 'Usa o botão “Inserir” para fórmulas, desafios, imagens e caixas.',
        },
      ],
    },
  ],
};

// O endereço do site vem do `site` em astro.config.mjs.
export const GET: APIRoute = ({ site }) => Response.json({ ...config, site_url: site!.origin });
