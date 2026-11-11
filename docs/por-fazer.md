# Por fazer: pôr o painel de edição a funcionar

- [ ] Criar o repositório no GitHub e fazer push do ramo `main` (é o ramo de que o painel lê e onde grava).
- [ ] Corrigir os dois valores provisórios em `src/pages/admin/config.json.ts`: `repo` (`miguelrocha/maismat`) e `base_url`. O `branch` já está certo (`main`).
- [ ] Fazer o deploy do worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) no Cloudflare Workers, seguindo o README do projeto.
- [ ] Criar a OAuth App em GitHub → Settings → Developer settings → OAuth Apps. O “callback URL” é `https://<worker>/callback`. Depois, pôr `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no worker e `ALLOWED_DOMAINS=maismat.miguelrocha.dev`.
- [ ] No Cloudflare Pages: ligar o repositório, com o comando `npm run build`, a pasta `dist` e `main` como ramo de produção.
- [ ] Convidar a Rosa e a Carla como colaboradoras em Settings → Collaborators, depois de criarem conta no GitHub.
- [ ] Testar com o login real: criar uma edição em rascunho, um artigo nela, confirmar que não aparece no site, desligar o rascunho e confirmar que aparece.
