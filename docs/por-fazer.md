# Por fazer: pôr o painel de edição a funcionar

- [ ] Criar o repositório no GitHub e fazer push. Atenção: o ramo local é `master`, mas a configuração diz `main`; acertar o nome do ramo.
- [ ] Corrigir os três valores provisórios em `src/pages/admin/config.json.ts`: `repo` (`miguelrocha/maismat`), `branch` e `base_url`.
- [ ] Fazer o deploy do worker [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) no Cloudflare Workers, seguindo o README do projeto.
- [ ] Criar a OAuth App em GitHub → Settings → Developer settings → OAuth Apps. O “callback URL” é `https://<worker>/callback`. Depois, pôr `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no worker e `ALLOWED_DOMAINS=maismat.miguelrocha.dev`.
- [ ] No Cloudflare Pages: ligar o repositório, com o comando `npm run build` e a pasta `dist`.
- [ ] Convidar a Rosa e a Carla como colaboradoras em Settings → Collaborators, depois de criarem conta no GitHub.
- [ ] Testar com o login real: criar uma edição em rascunho, um artigo nela, confirmar que não aparece no site, desligar o rascunho e confirmar que aparece.
