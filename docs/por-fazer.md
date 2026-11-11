# Por fazer

## Pôr o painel de edição a funcionar

- [ ] Criar o repositório no GitHub e fazer push do ramo `main` (é o ramo de que o painel lê e onde grava).
- [ ] Corrigir os dois valores provisórios em `src/pages/admin/config.json.ts`: `repo` (`miguelrocha/maismat`) e `base_url`. O `branch` já está certo (`main`).
- [ ] Fazer o deploy do worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) no Cloudflare Workers, seguindo o README do projeto.
- [ ] Criar a OAuth App em GitHub → Settings → Developer settings → OAuth Apps. O “callback URL” é `https://<worker>/callback`. Depois, pôr `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no worker e `ALLOWED_DOMAINS=maismat.miguelrocha.dev`.
- [ ] No Cloudflare Pages: ligar o repositório, com o comando `npm run build`, a pasta `dist` e `main` como ramo de produção.
- [ ] Convidar a Rosa e a Carla como colaboradoras em Settings → Collaborators, depois de criarem conta no GitHub.
- [ ] Testar com o login real: criar uma edição em rascunho, um artigo nela, confirmar que não aparece no site, desligar o rascunho e confirmar que aparece.
- [ ] Com o login real, testar as demonstrações e o GeoGebra no painel (a documentação diz que funciona, mas não deu para testar sem login):
  - em **Demonstrações → Novo**, o campo «Código» mostra o editor de código e grava o ficheiro `.yml` com o HTML tal como foi colado;
  - a pré-visualização (olho) corre a demonstração. Se ficar em branco, a moldura da pré-visualização do Sveltia não deixa correr scripts: tirar o `registerPreviewTemplate` de `public/admin/index.html` (fica a ver-se o código);
  - o novo identificador sai sem acentos (por exemplo `cicloide-…`), por causa do `slug` em `config.json.ts`;
  - em **Inserir → Demonstração**, a lista mostra as demonstrações pelo título (campo `relation`). Se não mostrar, trocar por um `select` gerado no build em `config.json.ts` (as demonstrações novas só aparecem na lista depois do deploy seguinte);
  - **Inserir → Applet GeoGebra** recusa uma ligação que não é de um applet e grava `<GeoGebra ligacao="…" titulo="…" altura={500} />`.

## No dia do lançamento

- [ ] Pôr em `LANCAMENTO` (`src/lib/git.mjs`) o dia real do lançamento. Os commits antes dessa data não contam como atualizações dos artigos (`dateModified`).

## Depois do primeiro deploy

- [ ] Um endereço que não existe devolve 404 (e não 200), com a página do +MAT:
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' https://maismat.miguelrocha.dev/nao-existe/
  ```
- [ ] Os cabeçalhos de segurança chegam (devem aparecer seis linhas):
  ```bash
  curl -sI https://maismat.miguelrocha.dev/ | grep -iE "x-content|referrer|x-frame|content-security|permissions|strict-transport"
  ```
- [ ] Os ficheiros em `/_astro/` têm cache de um ano (`max-age=31536000, immutable`):
  ```bash
  curl -sI "https://maismat.miguelrocha.dev$(curl -s https://maismat.miguelrocha.dev/ | grep -o '/_astro/[^"]*\.css' | head -1)" | grep -i cache-control
  ```
- [ ] O `robots.txt` indica o sitemap e o `/admin/config.json` tem o `site_url` certo:
  ```bash
  curl -s https://maismat.miguelrocha.dev/robots.txt
  curl -s https://maismat.miguelrocha.dev/admin/config.json | grep -o '"site_url":"[^"]*"'
  ```
- [ ] Com os cabeçalhos novos, o painel (`/admin/`) abre, deixa entrar e mostra as fórmulas na pré-visualização; a pesquisa (`/pesquisa/`) dá resultados; nos desafios, o botão de copiar o código de progresso funciona.
- [ ] As demonstrações estão isoladas também quando abertas fora do artigo (o `astro preview` não aplica o `_headers`, por isso isto só se vê depois do deploy). Deve aparecer a CSP de `/*` e a de `/demonstracoes/*` juntas por uma vírgula, e o `X-Robots-Tag`:
  ```bash
  curl -sI https://maismat.miguelrocha.dev/demonstracoes/cicloide/ | grep -iE "content-security|x-robots"
  ```
- [ ] No artigo da ciclóide (`/edicoes/ano3-edicao3/05-cicloide/`), a demonstração aparece e anima, no computador e no telemóvel (o `frame-ancestors 'self'` não a pode bloquear). Abrir `/demonstracoes/cicloide/` diretamente: funciona, e na consola `self.origin` dá `"null"`.
- [ ] Num artigo com um applet GeoGebra: antes do clique não há pedidos a geogebra.org (separador Rede das ferramentas de programador); depois do clique o applet aparece e o botão de ecrã inteiro funciona.
- [ ] Colar a ligação de um artigo no WhatsApp ou no Teams: aparece a capa da edição, o título e o resumo.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) com a página inicial, uma edição e um artigo com fórmulas, em telemóvel. Se o LCP passar de 2,5 s ou o CLS de 0,1, ver o que o relatório aponta. Na consola do Chrome não deve haver avisos de fontes «preloaded but not used» (com o separador visível).
- [ ] [Teste de Resultados Avançados](https://search.google.com/test/rich-results) com um artigo e uma edição: o artigo aparece como *Article*, sem erros, e com o logótipo no *publisher*. Avisos sobre campos opcionais podem ficar.
- [ ] [Consola de Pesquisa da Google](https://search.google.com/search-console):
  - adicionar o site (por prefixo de URL, `https://maismat.miguelrocha.dev/`);
  - em *Sitemaps*, submeter `sitemap-index.xml`;
  - em *Definições → robots.txt*, confirmar que foi lido sem erros;
  - em *Inspeção de URLs*, com um artigo: o canónico escolhido pela Google é o declarado pelo site;
  - uns dias depois, em *Páginas*, ver se há páginas excluídas por engano (só a 404, o painel e as versões para imprimir podem ficar de fora).

## Depois do deploy do redesign «Caderno»

- [ ] Num telemóvel verdadeiro (iPhone e Android), em claro e em escuro:
  - a barra de baixo não tapa o fim das páginas nem o rodapé, e no iPhone fica acima da barra do sistema (`safe-area-inset-bottom`);
  - «Mais» abre a folha, que fecha com «Fechar», ao tocar fora dela e ao escolher uma ligação; «Levar o progresso dos desafios» abre o painel em `/desafios/#levar`;
  - na pesquisa, a linha das secções desliza para o lado e a secção escolhida aparece à vista.
- [ ] Os cinco estados do desafio, com uma resposta certa verdadeira (no painel de pré-visualização só se viu o «certo» de um desafio já resolvido): fundo verde, pastilha «✓ Desafio N» e a resolução aberta num bloco branco. Com uma resposta errada, «✕ Ainda não…».
- [ ] A demonstração da ciclóide aparece dentro da moldura nova (o painel de pré-visualização bloqueia iframes, por isso só se viu a moldura vazia).
- [ ] Só com o teclado, da página inicial até responder a um desafio: o anel de foco de 3 px vê-se sempre, também sobre os botões azuis e na barra em pastilha.
- [ ] Com «Reduzir movimento» ligado no sistema, o anel de progresso aparece já cheio e os cartões não sobem.
- [ ] O destaque azul do início no modo escuro (azul claro com texto escuro): ver se fica bem ou se deve passar a superfície escura.
- [ ] Imprimir uma edição: sem faixa, barras, folha «Mais» nem rodapé.
- [ ] No PageSpeed Insights, a Playfair já não aparece nos pedidos e as duas fontes pré-carregadas (Inter e Source Serif 4) são usadas.

## Depois da primeira edição feita no painel

- [ ] No código-fonte do artigo editado (já publicado), procurar `dateModified` com a data da edição. Se não estiver lá, o Cloudflare Pages está a fazer um clone parcial (shallow) do repositório e a data fica de fora; o resto do site não é afetado.

## Quando houver domínio definitivo

- [ ] Mudar o `site` em `astro.config.mjs`. O resto do site e as verificações seguem-no sozinhos.
- [ ] Atualizar à mão o endereço em `docs/guia-professoras.md` e neste ficheiro, e o `ALLOWED_DOMAINS` do worker do painel.
- [ ] Redirecionar o domínio provisório para o novo (301) e, na Consola de Pesquisa, adicionar o novo e usar *Mudança de endereço* no antigo.
