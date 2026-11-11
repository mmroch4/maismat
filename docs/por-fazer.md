# Por fazer

## Pôr o painel de edição a funcionar

- [ ] Criar o repositório no GitHub e fazer push do ramo `main` (é o ramo de que o painel lê e onde grava).
- [ ] Corrigir os dois valores provisórios em `src/pages/admin/config.json.ts`: `repo` (`miguelrocha/maismat`) e `base_url`. O `branch` já está certo (`main`).
- [ ] Fazer o deploy do worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) no Cloudflare Workers, seguindo o README do projeto.
- [ ] Criar a OAuth App em GitHub → Settings → Developer settings → OAuth Apps. O “callback URL” é `https://<worker>/callback`. Depois, pôr `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no worker e `ALLOWED_DOMAINS=maismat.miguelrocha.dev`.
- [ ] No Cloudflare Pages: ligar o repositório, com o comando `npm run build`, a pasta `dist` e `main` como ramo de produção.
- [ ] Convidar a Rosa e a Carla como colaboradoras em Settings → Collaborators, depois de criarem conta no GitHub.
- [ ] Testar com o login real: criar uma edição em rascunho, um artigo nela, confirmar que não aparece no site, desligar o rascunho e confirmar que aparece.

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
- [ ] Colar a ligação de um artigo no WhatsApp ou no Teams: aparece a capa da edição, o título e o resumo.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) com a página inicial, uma edição e um artigo com fórmulas, em telemóvel. Se o LCP passar de 2,5 s ou o CLS de 0,1, ver o que o relatório aponta. Na consola do Chrome não deve haver avisos de fontes «preloaded but not used» (com o separador visível).
- [ ] [Teste de Resultados Avançados](https://search.google.com/test/rich-results) com um artigo e uma edição: o artigo aparece como *Article*, sem erros, e com o logótipo no *publisher*. Avisos sobre campos opcionais podem ficar.
- [ ] [Consola de Pesquisa da Google](https://search.google.com/search-console):
  - adicionar o site (por prefixo de URL, `https://maismat.miguelrocha.dev/`);
  - em *Sitemaps*, submeter `sitemap-index.xml`;
  - em *Definições → robots.txt*, confirmar que foi lido sem erros;
  - em *Inspeção de URLs*, com um artigo: o canónico escolhido pela Google é o declarado pelo site;
  - uns dias depois, em *Páginas*, ver se há páginas excluídas por engano (só a 404, o painel e as versões para imprimir podem ficar de fora).

## Depois da primeira edição feita no painel

- [ ] No código-fonte do artigo editado (já publicado), procurar `dateModified` com a data da edição. Se não estiver lá, o Cloudflare Pages está a fazer um clone parcial (shallow) do repositório e a data fica de fora; o resto do site não é afetado.

## Quando houver domínio definitivo

- [ ] Mudar o `site` em `astro.config.mjs`. O resto do site e as verificações seguem-no sozinhos.
- [ ] Atualizar à mão o endereço em `docs/guia-professoras.md` e neste ficheiro, e o `ALLOWED_DOMAINS` do worker do painel.
- [ ] Redirecionar o domínio provisório para o novo (301) e, na Consola de Pesquisa, adicionar o novo e usar *Mudança de endereço* no antigo.
