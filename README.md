# +MAT — versão digital

Versão digital do **+MAT, Jornal de Matemática** do Agrupamento de Escolas Domingos Sequeira
(direção e edição: Rosa Bértolo e Carla Nunes).

Desenvolvida por **Miguel Rocha** e disponibilizada gratuitamente à escola, desde que a autoria e os créditos
(rodapé e página “Sobre”) se mantenham visíveis.

## Correr localmente

```bash
npm install
npm run dev
```

## Estrutura

- `src/content/edicoes/` — uma ficha por edição (data, capa, PDF original, `convertida: false` se ainda só há PDF).
- `src/content/artigos/<edição>/` — um ficheiro `.mdx` por artigo, com as imagens em `img/`.
- `public/pdf/` — PDFs originais.
- `src/components/Desafio.astro` — desafio com verificação de resposta (só o hash vai para o HTML).
- `src/components/ArranhaCeus.astro` — puzzle jogável.

### Escrever artigos

As professoras escrevem no painel de edição em `/admin/` (Sveltia CMS); ver [docs/guia-professoras.md](docs/guia-professoras.md).
A configuração do painel está em `src/pages/admin/config.json.ts` e os blocos do editor em `public/admin/componentes.js`.
Os componentes de `src/lib/componentes-mdx.ts` estão disponíveis em todos os artigos sem `import`.

- Fórmulas em LaTeX: `$x^2$` no texto, `$$ ... $$` em destaque.
- Imagem com legenda: `![descrição](./img/foto.jpg "Legenda")`.
- Desafio:

  ```mdx
  <Desafio id="desafio-1a2b3c4d" numero={1} titulo="..." resposta="31|trinta e um">
  Enunciado...
  <div slot="resolucao">Explicação...</div>
  </Desafio>
  ```
