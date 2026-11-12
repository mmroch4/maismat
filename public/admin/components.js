// Editor blocks: each one reads and writes the MDX of the articles, so nobody has to write JSX by hand.
// The output must still be understood by src/components/*.astro and src/lib/mdx-components.ts.
// Labels and hints are shown to the teachers, so they stay in Portuguese.

// ---- Reading and writing simple JSX attributes: text="…", number={1}, options={['a', 'b']}

const readStrings = (expr) =>
  [...expr.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'));

export function readAttributes(source = '') {
  const attrs = {};
  for (const m of source.matchAll(/(\w+)=(?:"([^"]*)"|\{([\s\S]*?)\}(?=\s+\w+=|\s*$))/g)) {
    const [, name, text, expr] = m;
    if (text !== undefined) attrs[name] = text;
    else if (expr.trim().startsWith('[')) attrs[name] = /['"]/.test(expr) ? readStrings(expr) : JSON.parse(expr);
    else if (/^\s*["']/.test(expr)) attrs[name] = readStrings(expr)[0];
    else attrs[name] = Number(expr);
  }
  return attrs;
}

const attribute = (name, value) => {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return '';
  if (typeof value === 'number') return ` ${name}={${value}}`;
  if (Array.isArray(value))
    return ` ${name}={[${value.map((v) => (v.includes("'") ? JSON.stringify(v) : `'${v}'`)).join(', ')}]}`;
  const text = String(value);
  return text.includes('"') ? ` ${name}={${JSON.stringify(text)}}` : ` ${name}="${text}"`;
};

// Generated once, when the challenge is first saved; from then on it is written in the article.
const newChallengeId = () => `desafio-${crypto.randomUUID().slice(0, 8)}`;

const wrap = (open, content, close) => `${open}\n\n${content.trim()}\n\n${close}`;

// ---- Formula preview with the KaTeX loaded in index.html

function katex(tex, displayMode) {
  const el = document.createElement(displayMode ? 'div' : 'span');
  try {
    window.katex.render(tex || '?', el, { displayMode, throwOnError: false, strict: false });
  } catch {
    el.textContent = tex;
  }
  return el;
}

const askFormula = (current = '') => {
  const tex = window.prompt('Fórmula em LaTeX (por exemplo \\frac{1}{2} ou x^2):', current);
  return tex?.trim() ? { tex: tex.trim() } : null;
};

const box = (className, title, ...children) => {
  const el = document.createElement('div');
  el.className = `mm-${className}`;
  if (title) {
    const h = document.createElement('strong');
    h.textContent = title;
    el.append(h);
  }
  el.append(...children);
  return el;
};

const richText = (markdown) => {
  const el = document.createElement('div');
  if (markdown) window.CMS.renderRichText(el, markdown);
  return el;
};

// ---- Blocks

export const formula = {
  id: 'formula',
  label: 'Fórmula',
  icon: 'function',
  type: 'inline',
  trigger: '$',
  pattern: /(?<!\$)\$(?!\$)(?<tex>[^$\n]+?)\$(?!\$)/,
  toInline: ({ tex = '' }) => `$${tex}$`,
  toPreview: ({ tex = '' }) => katex(tex, false),
  onInsert: async ({ selectedText }) => askFormula(selectedText),
  onEdit: async ({ data }) => askFormula(data.tex),
};

export const displayFormula = {
  id: 'display-formula',
  label: 'Fórmula em destaque',
  icon: 'functions',
  fields: [
    {
      name: 'tex',
      label: 'Fórmula (LaTeX)',
      widget: 'text',
      hint: 'Fica centrada numa linha só para ela. Consulta a cábula no guia.',
    },
  ],
  pattern: /^\$\$\n(?<tex>[\s\S]*?)\n\$\$$/m,
  toBlock: ({ tex = '' }) => `$$\n${tex.trim()}\n$$`,
  toPreview: ({ tex = '' }) => katex(tex, true),
};

const SOLUTION_SLOT = '<div slot="solution">';

export const challenge = {
  id: 'challenge',
  label: 'Desafio',
  icon: 'extension',
  fields: [
    { name: 'number', label: 'Número', required: false, hint: 'Opcional: 1, 2, 3…' },
    { name: 'title', label: 'Título' },
    { name: 'statement', label: 'Enunciado', widget: 'richtext', required: false },
    {
      name: 'answer',
      label: 'Resposta certa',
      required: false,
      hint: 'Não aparece no site: os alunos escrevem a resposta e o site diz se está certa. Várias respostas aceites separam-se com | (ex.: 31|trinta e um). Deixa vazio se não quiseres verificação.',
    },
    {
      name: 'options',
      label: 'Opções (escolha múltipla)',
      widget: 'list',
      required: false,
      hint: 'Opcional. Se preencheres, a resposta certa tem de ser igual a uma das opções.',
      field: { name: 'option', label: 'Opção', widget: 'string' },
    },
    {
      name: 'unit',
      label: 'Unidade',
      required: false,
      hint: 'Opcional, aparece ao lado da caixa de resposta (ex.: cm², bilhetes).',
    },
    {
      name: 'decimals',
      label: 'Casas decimais',
      widget: 'number',
      value_type: 'int',
      required: false,
      hint: 'Opcional. Para respostas numéricas: 1 aceita 56,5 quando a resposta é 56.54.',
    },
    { name: 'source', label: 'Fonte', required: false, hint: 'Opcional, por exemplo “ONEM 2010 — adaptado”.' },
    {
      name: 'id',
      label: 'Identificador',
      required: false,
      hint: 'Preenchido automaticamente ao guardar; não alteres. Guarda o progresso dos alunos. Se copiaste este desafio de outro para fazer um problema diferente, apaga-o para ser gerado um novo.',
    },
    {
      name: 'solution',
      label: 'Resolução',
      widget: 'richtext',
      required: false,
      hint: 'Se ficar vazia, o site diz que a resolução sai na próxima edição.',
    },
  ],
  pattern: /^<Challenge\b(?<attrs>(?:[^>"{}]|"[^"]*"|\{[^}]*\})*?)\s*(?:\/>|>(?<body>[\s\S]*?)<\/Challenge>)/m,
  fromBlock: (m) => {
    const { id, number, title = '', answer, options, unit, source, decimals } = readAttributes(m.groups.attrs);
    const body = m.groups.body ?? '';
    const i = body.indexOf(SOLUTION_SLOT);
    const statement = i < 0 ? body : body.slice(0, i);
    const solution = i < 0 ? '' : body.slice(i + SOLUTION_SLOT.length).replace(/<\/div>\s*$/, '');
    return {
      id: id ?? '',
      number: number === undefined ? '' : String(number),
      title,
      statement: statement.trim(),
      answer: answer ?? '',
      options: options ?? [],
      unit: unit ?? '',
      decimals,
      source: source ?? '',
      solution: solution.trim(),
    };
  },
  toBlock: ({
    id = '',
    number = '',
    title = '',
    statement = '',
    answer = '',
    options = [],
    unit = '',
    decimals,
    source = '',
    solution = '',
  }) => {
    const n = String(number).trim();
    const attrList = [
      attribute('id', id.trim() || newChallengeId()),
      attribute('number', /^\d+$/.test(n) ? Number(n) : n),
      attribute('title', title),
      attribute('answer', answer),
      attribute('decimals', typeof decimals === 'number' && !Number.isNaN(decimals) ? decimals : undefined),
      attribute('unit', unit),
      attribute('source', source),
      attribute('options', options.filter(Boolean)),
    ].filter(Boolean);
    const line = attrList.join('');
    // With many attributes, one per line, like in the articles already written.
    const attrs = line.length > 120 ? `${attrList.map((a) => `\n ${a}`).join('')}\n` : line;
    if (!statement.trim() && !solution.trim()) return `<Challenge${attrs} />`;
    const parts = [statement.trim(), solution.trim() && `${wrap(SOLUTION_SLOT, solution, '</div>')}\n`];
    return `<Challenge${attrs}>\n\n${parts.filter(Boolean).join('\n\n')}${solution.trim() ? '' : '\n\n'}</Challenge>`;
  },
  toPreview: ({ number = '', title = '', statement = '', answer = '', solution = '' }) => {
    const answerEl = document.createElement('p');
    answerEl.className = 'mm-answer';
    answerEl.textContent = answer ? `Resposta: ${answer}` : 'Sem verificação de resposta';
    const children = [richText(statement), answerEl];
    if (solution) children.push(box('solution', 'Resolução', richText(solution)));
    return box('challenge', `Desafio${number ? ` ${number}` : ''}: ${title}`, ...children);
  },
};

const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export const gallery = {
  id: 'gallery',
  label: 'Galeria de imagens',
  icon: 'photo_library',
  fields: [
    {
      name: 'images',
      label: 'Imagens',
      widget: 'list',
      summary: '{{caption}}',
      fields: [
        { name: 'src', label: 'Imagem', widget: 'image' },
        { name: 'alt', label: 'Descrição da imagem', hint: 'Para quem não vê a imagem (leitores de ecrã).' },
        { name: 'caption', label: 'Legenda', required: false },
      ],
    },
  ],
  pattern: /^<div class="gallery">\n(?<images>[\s\S]*?)\n<\/div>$/m,
  fromBlock: (m) => ({
    images: [...m.groups.images.matchAll(IMAGE)].map(([, alt, src, caption = '']) => ({ src, alt, caption })),
  }),
  toBlock: ({ images = [] }) =>
    wrap(
      '<div class="gallery">',
      images
        .map(
          ({ src = '', alt = '', caption = '' }) =>
            `![${alt}](${src}${caption ? ` "${caption.replaceAll('"', '”')}"` : ''})`,
        )
        .join('\n\n'),
      '</div>',
    ),
  toPreview: ({ images = [] }) =>
    box(
      'gallery',
      '',
      ...images.map(({ src = '', alt = '' }) => Object.assign(document.createElement('img'), { src, alt })),
    ),
};

export const note = {
  id: 'note',
  label: 'Nota (caixa amarela)',
  icon: 'sticky_note_2',
  fields: [{ name: 'text', label: 'Texto', widget: 'richtext' }],
  pattern: /^<div class="note">\n\n(?<text>[\s\S]*?)\n\n<\/div>$/m,
  toBlock: ({ text = '' }) => wrap('<div class="note">', text, '</div>'),
  toPreview: ({ text = '' }) => box('note', '', richText(text)),
};

export const details = {
  id: 'details',
  label: 'Caixa “ver mais”',
  icon: 'expand_circle_down',
  fields: [
    { name: 'summary', label: 'Texto do botão', hint: 'Por exemplo “Ver a resolução passo a passo”.' },
    { name: 'text', label: 'Conteúdo escondido', widget: 'richtext' },
  ],
  pattern: /^<details>\n<summary>(?<summary>.*?)<\/summary>\n\n(?<text>[\s\S]*?)\n\n<\/details>$/m,
  toBlock: ({ summary = '', text = '' }) => wrap(`<details>\n<summary>${summary}</summary>`, text, '</details>'),
  toPreview: ({ summary = '', text = '' }) => box('details', `▸ ${summary}`, richText(text)),
};

const INTERACTIVES = {
  PascalTriangle: 'Triângulo de Pascal colorido',
  Collatz: 'Calculadora de Collatz',
  MontyHall: 'Jogo de Monty Hall',
  Skyscrapers: 'Jogo do arranha-céus',
};

export const interactive = {
  id: 'interactive',
  label: 'Jogo ou animação',
  icon: 'sports_esports',
  mode: 'dialog',
  summary: '{{component}}',
  fields: [
    {
      name: 'component',
      label: 'Qual',
      widget: 'select',
      options: Object.entries(INTERACTIVES).map(([value, label]) => ({ value, label })),
    },
    {
      name: 'props',
      label: 'Opções avançadas',
      required: false,
      hint: 'Normalmente fica vazio. O jogo do arranha-céus precisa das pistas, por exemplo: top={[1, 4, 2, 2]} bottom={[3, 1, 3, 2]} left={[1, 2, 3, 2]} right={[3, 2, 1, 2]}',
    },
  ],
  pattern: new RegExp(`^<(?<component>${Object.keys(INTERACTIVES).join('|')})\\b(?<props>[^>]*?)\\s*\\/>$`, 'm'),
  fromBlock: (m) => ({ component: m.groups.component, props: m.groups.props.trim() }),
  toBlock: ({ component = 'PascalTriangle', props = '' }) =>
    `<${component}${props.trim() ? ` ${props.trim()}` : ''} />`,
  toPreview: ({ component = 'PascalTriangle' }) => box('interactive', `🎲 ${INTERACTIVES[component] ?? component}`),
};

export const demo = {
  id: 'demo',
  label: 'Demonstração',
  icon: 'animation',
  mode: 'dialog',
  summary: '{{id}}',
  fields: [
    {
      name: 'id',
      label: 'Qual',
      widget: 'relation',
      collection: 'demos',
      value_field: '{{slug}}',
      search_fields: ['title'],
      display_fields: ['title'],
      hint: 'Cria-a primeiro em «Demonstrações», no menu da esquerda.',
    },
  ],
  pattern: /^<Demo id="(?<id>[^"]*)" \/>$/m,
  fromBlock: (m) => ({ id: m.groups.id }),
  toBlock: ({ id = '' }) => `<Demo id="${id}" />`,
  toPreview: ({ id = '' }) => box('interactive', `▶ Demonstração: ${id}`),
};

// GeoGebra applets: accepts the «Partilhar» (share) link and gives the URL that embeds only the applet.
// Also used by src/components/GeoGebra.astro and by the build checks.
export const GEOGEBRA_URL =
  /^https:\/\/(?:www\.)?geogebra\.org\/(?:m|calculator|classic|graphing|geometry|3d)\/([A-Za-z0-9]{8})\/?(?:[?#].*)?$/;

/**
 * @param {string} [url] the applet's share link
 * @param {number} [height]
 * @returns {{ page: string, iframe: string } | undefined}
 */
export function geogebraUrls(url = '', height = 500) {
  const id = url.trim().match(GEOGEBRA_URL)?.[1];
  if (!id) return undefined;
  return {
    page: `https://www.geogebra.org/m/${id}`,
    iframe: `https://www.geogebra.org/material/iframe/id/${id}/width/800/height/${height}/border/888888/sfsb/true/smb/false/stb/false/stbh/false/ai/false/asb/false/sri/true/rc/false/ld/false/sdz/false/ctl/false`,
  };
}

export const geogebra = {
  id: 'geogebra',
  label: 'Applet GeoGebra',
  icon: 'change_history',
  mode: 'dialog',
  summary: '{{title}}',
  fields: [
    {
      name: 'url',
      label: 'Ligação do applet',
      hint: 'No GeoGebra, abre o applet, carrega em «Partilhar» e copia a ligação, por exemplo https://www.geogebra.org/m/p68vtggs.',
      pattern: [
        GEOGEBRA_URL.source,
        'Tem de ser a ligação de um applet: https://www.geogebra.org/m/ seguido de 8 letras e algarismos.',
      ],
    },
    { name: 'title', label: 'Título', hint: 'O que o applet mostra. É o que os leitores de ecrã anunciam.' },
    {
      name: 'height',
      label: 'Altura (px)',
      widget: 'number',
      value_type: 'int',
      min: 250,
      max: 900,
      default: 500,
      hint: 'A altura com 800 px de largura; nos ecrãs mais estreitos o applet encolhe na mesma proporção.',
    },
  ],
  pattern: /^<GeoGebra\b(?<attrs>(?:[^>"{}]|"[^"]*"|\{[^}]*\})*?)\s*\/>$/m,
  fromBlock: (m) => {
    const { url = '', title = '', height = 500 } = readAttributes(m.groups.attrs);
    return { url, title, height };
  },
  toBlock: ({ url = '', title = '', height = 500 }) =>
    `<GeoGebra${attribute('url', url.trim())}${attribute('title', title)}${attribute('height', height)} />`,
  toPreview: ({ title = '' }) => box('interactive', `△ GeoGebra: ${title}`),
};

export const editorComponents = [
  formula,
  displayFormula,
  challenge,
  gallery,
  note,
  details,
  interactive,
  demo,
  geogebra,
];
