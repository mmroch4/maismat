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

- Fórmulas em LaTeX: `$x^2$` no texto, `$$ ... $$` em destaque.
- Imagem com legenda: `![descrição](./img/foto.jpg "Legenda")`.
- Desafio:

  ```mdx
  <Desafio numero={1} titulo="..." resposta="31|trinta e um">
  Enunciado...
  <div slot="resolucao">Explicação...</div>
  </Desafio>
  ```
