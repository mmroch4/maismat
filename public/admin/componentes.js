// Blocos do editor: cada um sabe ler e escrever o MDX dos artigos, para ninguém ter de escrever JSX à mão.
// O resultado tem de continuar a ser compreendido por src/components/*.astro e por src/lib/componentes-mdx.ts.

// ---- Leitura e escrita de atributos JSX simples: texto="…", numero={1}, opcoes={['a', 'b']}

const lerTextos = (expr) => [...expr.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'));

export function lerAtributos(fonte = '') {
  const attrs = {};
  for (const m of fonte.matchAll(/(\w+)=(?:"([^"]*)"|\{([\s\S]*?)\}(?=\s+\w+=|\s*$))/g)) {
    const [, nome, texto, expr] = m;
    if (texto !== undefined) attrs[nome] = texto;
    else if (expr.trim().startsWith('[')) attrs[nome] = /['"]/.test(expr) ? lerTextos(expr) : JSON.parse(expr);
    else if (/^\s*["']/.test(expr)) attrs[nome] = lerTextos(expr)[0];
    else attrs[nome] = Number(expr);
  }
  return attrs;
}

const atributo = (nome, valor) => {
  if (valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && !valor.length)) return '';
  if (typeof valor === 'number') return ` ${nome}={${valor}}`;
  if (Array.isArray(valor)) return ` ${nome}={[${valor.map((v) => (v.includes("'") ? JSON.stringify(v) : `'${v}'`)).join(', ')}]}`;
  const texto = String(valor);
  return texto.includes('"') ? ` ${nome}={${JSON.stringify(texto)}}` : ` ${nome}="${texto}"`;
};

const comConteudo = (abrir, conteudo, fechar) => `${abrir}\n\n${conteudo.trim()}\n\n${fechar}`;

// ---- Pré-visualização das fórmulas com o KaTeX carregado em index.html

function katex(tex, emDestaque) {
  const el = document.createElement(emDestaque ? 'div' : 'span');
  try {
    window.katex.render(tex || '?', el, { displayMode: emDestaque, throwOnError: false, strict: false });
  } catch {
    el.textContent = tex;
  }
  return el;
}

const pedirFormula = (atual = '') => {
  const tex = window.prompt('Fórmula em LaTeX (por exemplo \\frac{1}{2} ou x^2):', atual);
  return tex?.trim() ? { tex: tex.trim() } : null;
};

const caixa = (classe, titulo, ...filhos) => {
  const el = document.createElement('div');
  el.className = `mm-${classe}`;
  if (titulo) {
    const h = document.createElement('strong');
    h.textContent = titulo;
    el.append(h);
  }
  el.append(...filhos);
  return el;
};

const textoRico = (markdown) => {
  const el = document.createElement('div');
  if (markdown) window.CMS.renderRichText(el, markdown);
  return el;
};

// ---- Blocos

export const formula = {
  id: 'formula',
  label: 'Fórmula',
  icon: 'function',
  type: 'inline',
  trigger: '$',
  pattern: /(?<!\$)\$(?!\$)(?<tex>[^$\n]+?)\$(?!\$)/,
  toInline: ({ tex = '' }) => `$${tex}$`,
  toPreview: ({ tex = '' }) => katex(tex, false),
  onInsert: async ({ selectedText }) => pedirFormula(selectedText),
  onEdit: async ({ data }) => pedirFormula(data.tex),
};

export const formulaDestaque = {
  id: 'formula-destaque',
  label: 'Fórmula em destaque',
  icon: 'functions',
  fields: [{ name: 'tex', label: 'Fórmula (LaTeX)', widget: 'text', hint: 'Fica centrada numa linha só para ela. Consulta a cábula no guia.' }],
  pattern: /^\$\$\n(?<tex>[\s\S]*?)\n\$\$$/m,
  toBlock: ({ tex = '' }) => `$$\n${tex.trim()}\n$$`,
  toPreview: ({ tex = '' }) => katex(tex, true),
};

export const desafio = {
  id: 'desafio',
  label: 'Desafio',
  icon: 'extension',
  fields: [
    { name: 'numero', label: 'Número', required: false, hint: 'Opcional: 1, 2, 3…' },
    { name: 'titulo', label: 'Título' },
    { name: 'enunciado', label: 'Enunciado', widget: 'richtext', required: false },
    {
      name: 'resposta',
      label: 'Resposta certa',
      required: false,
      hint: 'Não aparece no site: os alunos escrevem a resposta e o site diz se está certa. Várias respostas aceites separam-se com | (ex.: 31|trinta e um). Deixa vazio se não quiseres verificação.',
    },
    {
      name: 'opcoes',
      label: 'Opções (escolha múltipla)',
      widget: 'list',
      required: false,
      hint: 'Opcional. Se preencheres, a resposta certa tem de ser igual a uma das opções.',
      field: { name: 'opcao', label: 'Opção', widget: 'string' },
    },
    { name: 'unidade', label: 'Unidade', required: false, hint: 'Opcional, aparece ao lado da caixa de resposta (ex.: cm², bilhetes).' },
    { name: 'casas', label: 'Casas decimais', widget: 'number', value_type: 'int', required: false, hint: 'Opcional. Para respostas numéricas: 1 aceita 56,5 quando a resposta é 56.54.' },
    { name: 'fonte', label: 'Fonte', required: false, hint: 'Opcional, por exemplo “ONEM 2010 — adaptado”.' },
    { name: 'resolucao', label: 'Resolução', widget: 'richtext', required: false, hint: 'Se ficar vazia, o site diz que a resolução sai na próxima edição.' },
  ],
  pattern: /^<Desafio\b(?<attrs>(?:[^>"{}]|"[^"]*"|\{[^}]*\})*?)\s*(?:\/>|>(?<corpo>[\s\S]*?)<\/Desafio>)/m,
  fromBlock: (m) => {
    const { numero, titulo = '', resposta, opcoes, unidade, fonte, casas } = lerAtributos(m.groups.attrs);
    const corpo = m.groups.corpo ?? '';
    const i = corpo.indexOf('<div slot="resolucao">');
    const enunciado = i < 0 ? corpo : corpo.slice(0, i);
    const resolucao = i < 0 ? '' : corpo.slice(i + '<div slot="resolucao">'.length).replace(/<\/div>\s*$/, '');
    return {
      numero: numero === undefined ? '' : String(numero),
      titulo,
      enunciado: enunciado.trim(),
      resposta: resposta ?? '',
      opcoes: opcoes ?? [],
      unidade: unidade ?? '',
      casas,
      fonte: fonte ?? '',
      resolucao: resolucao.trim(),
    };
  },
  toBlock: ({ numero = '', titulo = '', enunciado = '', resposta = '', opcoes = [], unidade = '', casas, fonte = '', resolucao = '' }) => {
    const n = String(numero).trim();
    const partesAttrs = [
      atributo('numero', /^\d+$/.test(n) ? Number(n) : n),
      atributo('titulo', titulo),
      atributo('resposta', resposta),
      atributo('casas', typeof casas === 'number' && !Number.isNaN(casas) ? casas : undefined),
      atributo('unidade', unidade),
      atributo('fonte', fonte),
      atributo('opcoes', opcoes.filter(Boolean)),
    ].filter(Boolean);
    const linha = partesAttrs.join('');
    // Com muitos atributos, um por linha, como nos artigos já escritos.
    const attrs = linha.length > 120 ? `${partesAttrs.map((a) => `\n ${a}`).join('')}\n` : linha;
    if (!enunciado.trim() && !resolucao.trim()) return `<Desafio${attrs} />`;
    const partes = [enunciado.trim(), resolucao.trim() && `${comConteudo('<div slot="resolucao">', resolucao, '</div>')}\n`];
    return `<Desafio${attrs}>\n\n${partes.filter(Boolean).join('\n\n')}${resolucao.trim() ? '' : '\n\n'}</Desafio>`;
  },
  toPreview: ({ numero = '', titulo = '', enunciado = '', resposta = '', resolucao = '' }) => {
    const resp = document.createElement('p');
    resp.className = 'mm-resposta';
    resp.textContent = resposta ? `Resposta: ${resposta}` : 'Sem verificação de resposta';
    const filhos = [textoRico(enunciado), resp];
    if (resolucao) filhos.push(caixa('resolucao', 'Resolução', textoRico(resolucao)));
    return caixa('desafio', `Desafio${numero ? ` ${numero}` : ''}: ${titulo}`, ...filhos);
  },
};

const IMAGEM = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export const galeria = {
  id: 'galeria',
  label: 'Galeria de imagens',
  icon: 'photo_library',
  fields: [
    {
      name: 'imagens',
      label: 'Imagens',
      widget: 'list',
      summary: '{{legenda}}',
      fields: [
        { name: 'src', label: 'Imagem', widget: 'image' },
        { name: 'alt', label: 'Descrição da imagem', hint: 'Para quem não vê a imagem (leitores de ecrã).' },
        { name: 'legenda', label: 'Legenda', required: false },
      ],
    },
  ],
  pattern: /^<div class="galeria">\n(?<imagens>[\s\S]*?)\n<\/div>$/m,
  fromBlock: (m) => ({
    imagens: [...m.groups.imagens.matchAll(IMAGEM)].map(([, alt, src, legenda = '']) => ({ src, alt, legenda })),
  }),
  toBlock: ({ imagens = [] }) =>
    comConteudo(
      '<div class="galeria">',
      imagens.map(({ src = '', alt = '', legenda = '' }) => `![${alt}](${src}${legenda ? ` "${legenda.replaceAll('"', '”')}"` : ''})`).join('\n\n'),
      '</div>',
    ),
  toPreview: ({ imagens = [] }) =>
    caixa(
      'galeria',
      '',
      ...imagens.map(({ src = '', alt = '' }) => Object.assign(document.createElement('img'), { src, alt })),
    ),
};

export const nota = {
  id: 'nota',
  label: 'Nota (caixa amarela)',
  icon: 'sticky_note_2',
  fields: [{ name: 'texto', label: 'Texto', widget: 'richtext' }],
  pattern: /^<div class="nota">\n\n(?<texto>[\s\S]*?)\n\n<\/div>$/m,
  toBlock: ({ texto = '' }) => comConteudo('<div class="nota">', texto, '</div>'),
  toPreview: ({ texto = '' }) => caixa('nota', '', textoRico(texto)),
};

export const detalhes = {
  id: 'detalhes',
  label: 'Caixa “ver mais”',
  icon: 'expand_circle_down',
  fields: [
    { name: 'resumo', label: 'Texto do botão', hint: 'Por exemplo “Ver a resolução passo a passo”.' },
    { name: 'texto', label: 'Conteúdo escondido', widget: 'richtext' },
  ],
  pattern: /^<details>\n<summary>(?<resumo>.*?)<\/summary>\n\n(?<texto>[\s\S]*?)\n\n<\/details>$/m,
  toBlock: ({ resumo = '', texto = '' }) => comConteudo(`<details>\n<summary>${resumo}</summary>`, texto, '</details>'),
  toPreview: ({ resumo = '', texto = '' }) => caixa('detalhes', `▸ ${resumo}`, textoRico(texto)),
};

const INTERATIVOS = {
  TrianguloPascal: 'Triângulo de Pascal colorido',
  Collatz: 'Calculadora de Collatz',
  MontyHall: 'Jogo de Monty Hall',
  ArranhaCeus: 'Jogo do arranha-céus',
};

export const interativo = {
  id: 'interativo',
  label: 'Jogo ou animação',
  icon: 'sports_esports',
  mode: 'dialog',
  summary: '{{componente}}',
  fields: [
    {
      name: 'componente',
      label: 'Qual',
      widget: 'select',
      options: Object.entries(INTERATIVOS).map(([value, label]) => ({ value, label })),
    },
    {
      name: 'props',
      label: 'Opções avançadas',
      required: false,
      hint: 'Normalmente fica vazio. O jogo do arranha-céus precisa das pistas, por exemplo: cima={[1, 4, 2, 2]} baixo={[3, 1, 3, 2]} esquerda={[1, 2, 3, 2]} direita={[3, 2, 1, 2]}',
    },
  ],
  pattern: new RegExp(`^<(?<componente>${Object.keys(INTERATIVOS).join('|')})\\b(?<props>[^>]*?)\\s*\\/>$`, 'm'),
  fromBlock: (m) => ({ componente: m.groups.componente, props: m.groups.props.trim() }),
  toBlock: ({ componente = 'TrianguloPascal', props = '' }) => `<${componente}${props.trim() ? ` ${props.trim()}` : ''} />`,
  toPreview: ({ componente = 'TrianguloPascal' }) => caixa('interativo', `🎲 ${INTERATIVOS[componente] ?? componente}`),
};

export const componentes = [formula, formulaDestaque, desafio, galeria, nota, detalhes, interativo];
