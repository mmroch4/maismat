# Guia do painel de edição do +MAT

Este guia explica como publicar uma edição nova do +MAT sem mexer em código. Tudo se faz no browser, no **painel de edição**.

> Se algo correr mal, não há problema: o site guarda todas as versões anteriores e o Miguel consegue sempre recuperá-las.

## 1. Entrar no painel

1. Abra **https://maismat.miguelrocha.dev/admin/** (de preferência no Chrome, no Edge ou no Firefox).
2. Carregue em **Iniciar sessão com GitHub** e entre com a sua conta GitHub.
   - Só é preciso fazer isto da primeira vez em cada computador.
   - Se aparecer um pedido de autorização do “+MAT”, carregue em **Authorize**.
3. À esquerda aparecem duas listas: **Edições** e **Artigos**.

Se o painel aparecer em inglês, o browser está configurado em inglês: o conteúdo funciona igual.

## 2. Criar uma edição nova

Cria-se sempre **primeiro a edição** e só depois os artigos.

Uma edição nova começa em **rascunho**: pode trabalhar nela durante semanas sem que nada apareça no site.

1. Em **Edições**, carregue em **Novo**.
2. Preencha:
   - **Rascunho (escondida do site)**: deixe ligado enquanto prepara a edição.
   - **Ano do jornal**: o ano do +MAT (1, 2, 3, 4…), não o ano civil.
   - **Número da edição**: 1, 2 ou 3.
   - **Data de publicação**.
   - **Direção e edição**: já vem com os vossos nomes.
   - **Capa**: carregue a imagem da primeira página (JPG).
   - **PDF original** (opcional): o PDF da edição impressa.
   - **Citação** (opcional): frase e autor.
   - **Versão digital pronta**: deixe ligado. Desligue só se a edição tiver apenas o PDF.
3. Carregue em **Guardar**.

## 3. Criar um artigo

1. Em **Artigos**, carregue em **Novo**.
2. Preencha:
   - **Título**.
   - **Edição**: escolha a edição na lista.
   - **Secção**: escolha na lista (Curiosidades, Desafios, Notícias…).
   - **Ordem na edição**: 1 para o primeiro artigo, 2 para o segundo, etc.
   - **Autores**, **Resumo**, **Nível** e **Citação** são opcionais.
3. Escreva o texto em **Texto do artigo**, como num processador de texto: negrito, itálico, títulos, listas e ligações estão na barra de cima.
4. Carregue em **Guardar**.

Para ver como fica, carregue no ícone do **olho** (pré-visualização), no topo do editor.

## 4. Inserir uma imagem

1. No texto do artigo, ponha o cursor onde quer a imagem.
2. Carregue no ícone de **imagem** da barra (ou em **Inserir → Imagem**).
3. Carregue a imagem do computador.
4. Preencha:
   - **Texto alternativo**: uma descrição curta da imagem (serve para quem não a consegue ver).
   - **Título**: a **legenda** que aparece por baixo da imagem (opcional).

Para pôr várias imagens lado a lado, use **Inserir → Galeria de imagens**.

## 5. Inserir uma fórmula

Há duas maneiras:

- **Fórmula no meio do texto**: **Inserir → Fórmula**, escreva a fórmula em LaTeX e carregue em OK. Exemplo: escrever `x^2 + 1` mostra $x^2 + 1$.
  Também pode escrever diretamente entre cifrões: `$x^2 + 1$`.
- **Fórmula em destaque** (centrada, numa linha só para ela): **Inserir → Fórmula em destaque** e escreva a fórmula no campo.

A fórmula aparece já desenhada no editor. Se aparecer a vermelho, há um erro na fórmula: veja a cábula no fim deste guia.

## 6. Inserir um desafio

1. **Inserir → Desafio**.
2. Preencha:
   - **Número** (opcional) e **Título**.
   - **Enunciado**: o texto do problema. Pode ter imagens e fórmulas.
   - **Resposta certa**: o que os alunos têm de escrever. **Não aparece no site**: o aluno escreve a resposta e o site diz se está certa. Se houver várias respostas aceites, separe-as com uma barra vertical: `31|trinta e um`. Maiúsculas, acentos e espaços não contam.
   - **Opções** (opcional): para escolha múltipla. A resposta certa tem de ser exatamente igual a uma das opções.
   - **Unidade** (opcional): aparece ao lado da caixa (por exemplo, cm²).
   - **Casas decimais** (opcional): para respostas com vírgula. Com resposta `56.54` e 1 casa decimal, o site aceita 56,5.
   - **Fonte** (opcional): de onde veio o problema.
   - **Resolução** (opcional): aparece num botão “Ver resolução”. Se ficar vazia, o site diz que a resolução sai na próxima edição.
   - **Identificador**: deixe como está. É preenchido sozinho ao guardar e serve para o site se lembrar dos desafios que cada aluno já resolveu. Só há uma exceção: se copiar um desafio antigo para fazer um problema **diferente**, apague o identificador da cópia e o painel gera um novo.

Na edição seguinte, para publicar a resolução de um desafio antigo, abra esse artigo e preencha a **Resolução** desse desafio.

## 7. Outros blocos do menu Inserir

- **Nota (caixa amarela)**: um texto em destaque.
- **Caixa “ver mais”**: texto escondido que abre com um clique (por exemplo, uma resolução passo a passo).
- **Jogo ou animação**: os jogos interativos do site (Triângulo de Pascal, Collatz, Monty Hall, Arranha-céus).
- **Demonstração**: uma animação ou simulação feita por si (ver a secção 8).
- **Applet GeoGebra**: um applet do GeoGebra, só com a ligação (ver a secção 9).

## 8. Demonstrações

Uma demonstração é uma pequena página interativa (uma animação, uma simulação, um gráfico que se mexe) feita em HTML, CSS e JavaScript, à mão ou com a ajuda de uma IA. Fica dentro do artigo, numa caixa isolada do resto do site.

### Criar uma demonstração

1. Prepare o ficheiro HTML (à mão ou com o modelo de pedido para uma IA, mais abaixo).
2. Experimente-o primeiro no computador: guarde-o como `demonstracao.html` e abra-o com duplo clique. Se funcionar no browser, funciona no site.
3. No painel, em **Demonstrações** (à esquerda), carregue em **Novo** e preencha:
   - **Título**: o que a demonstração mostra, por exemplo «Ciclóide: a roda que desenha a curva». É o que os leitores de ecrã anunciam.
   - **Descrição**: uma ou duas frases. Aparece por baixo da demonstração e serve a quem não a consegue usar.
   - **Altura inicial**: deixe 400, se não souber. A caixa ajusta-se sozinha ao conteúdo.
   - **Código**: cole o ficheiro HTML inteiro.
4. Carregue em **Guardar**. Na pré-visualização (o ícone do **olho**) a demonstração já corre como no site.
5. No artigo, ponha o cursor onde a quer, carregue em **Inserir → Demonstração** e escolha-a na lista.

A mesma demonstração pode ser usada em vários artigos. Atenção: fica no site assim que a guarda, mesmo que a edição esteja em rascunho (num endereço que nenhum motor de busca mostra e a que só se chega pelo artigo).

### Regras

O site verifica estas regras sempre que alguém guarda. Se uma falhar, o site não é atualizado até ser corrigida, e a mensagem do erro (que o Miguel vê no Cloudflare) diz o que mudar.

- **Um só ficheiro**: o CSS dentro de `<style>` e o JavaScript dentro de `<script>`. Não há como carregar imagens ou outros ficheiros à parte.
- **Sem serviços externos**: a demonstração não pode ir buscar nada à Internet (fontes, imagens, dados). Só pode usar estas duas bibliotecas, exatamente com estes endereços:
  - p5.js: `https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/p5.min.js`
  - JSXGraph: `https://cdn.jsdelivr.net/npm/jsxgraph@1.14.2/distrib/jsxgraphcore.js` (e `…/distrib/jsxgraph.css`)
- **Coisas que não funcionam lá dentro**: `alert`, `confirm` e `prompt` (não aparece nada), guardar no browser (`localStorage`, cookies), contactar outros sites e abrir janelas novas. As mensagens escrevem-se num parágrafo da própria página.
- **Adaptada ao telemóvel**: largura a 100% (nada de larguras fixas) e botões com pelo menos 44 píxeis de altura.
- **Com contraste**: texto escuro sobre fundo claro, e um modo escuro. Não use só a cor para transmitir informação.
- **Pequena**: até 100 KB.
- **Português de Portugal** em todos os textos.

### Modelo de pedido para uma IA

Copie o texto abaixo para o ChatGPT, o Copilot, o Gemini ou o Claude, e troque o que está entre parênteses retos:

```
Faz uma demonstração interativa para alunos do [3.º ciclo] sobre [tema: o que se vê e o que o aluno pode mexer].

Regras obrigatórias:
1. Um só ficheiro HTML completo (<!doctype html>), com o CSS dentro de <style> e o JavaScript dentro de <script>.
2. Não carregues nada da Internet (nem fontes, nem imagens, nem dados). Prefere JavaScript simples com <canvas> ou SVG.
   Se precisares mesmo de uma biblioteca, usa só uma destas, exatamente com este endereço:
   https://cdn.jsdelivr.net/npm/p5@1.11.13/lib/p5.min.js
   https://cdn.jsdelivr.net/npm/jsxgraph@1.14.2/distrib/jsxgraphcore.js (com https://cdn.jsdelivr.net/npm/jsxgraph@1.14.2/distrib/jsxgraph.css)
3. Não uses alert(), confirm(), prompt(), localStorage, sessionStorage, cookies, fetch, formulários que se submetem nem janelas novas: estão bloqueados. Mostra as mensagens num parágrafo da página.
4. A página vai ficar numa caixa entre 320 e 700 píxeis de largura: usa largura 100%, nenhuma largura fixa, e redesenha quando a janela muda de tamanho. Botões e controlos com pelo menos 44 píxeis de altura.
5. Contraste forte (texto escuro sobre fundo claro) e um modo escuro com prefers-color-scheme. Não transmitas informação só pela cor.
6. Acessível: o <canvas> com role="img" e um aria-label que descreve o que mostra; um parágrafo com aria-live="polite" que diz o que está a acontecer; com prefers-reduced-motion, a animação começa parada.
7. Todo o texto em português de Portugal (não do Brasil).
8. O ficheiro tem de ter menos de 100 KB.
Responde só com o ficheiro HTML, num bloco de código.
```

Se o resultado não estiver bem, responda à IA com o que mudar («a roda é demasiado pequena no telemóvel», «põe um botão para recomeçar»). Antes de colar no painel, experimente sempre o ficheiro no computador.

Exemplo: a demonstração «Ciclóide: a roda que desenha a curva», no artigo da ciclóide (ano 3, edição 3), segue todas estas regras. Pode abri-la em **Demonstrações** para ver o código.

## 9. Applet GeoGebra

1. No GeoGebra, abra o applet e carregue em **Partilhar**. Copie a ligação (começa por `https://www.geogebra.org/m/`).
2. No artigo, carregue em **Inserir → Applet GeoGebra** e preencha:
   - **Ligação do applet**: cole a ligação.
   - **Título**: o que o applet mostra.
   - **Altura**: 500 serve para a maioria. Em ecrãs mais estreitos, o applet encolhe na mesma proporção.

No site, os alunos veem primeiro o título e um botão **Abrir o applet**: só nesse momento o browser se liga ao GeoGebra (que pode guardar cookies). Na versão para imprimir aparece o título e a ligação.

## 10. Publicar

Enquanto a edição estiver em rascunho, guarde à vontade: nem a edição nem os artigos aparecem no site. Na lista de **Edições**, as que estão em rascunho dizem “· rascunho”.

Quando estiver tudo pronto:

1. Confira cada artigo com o botão do **olho** (pré-visualização).
2. Abra a ficha da edição, **desligue “Rascunho”** e carregue em **Guardar**.
3. Em **2 a 3 minutos**, a edição inteira aparece no site e passa a ser a edição da página inicial.

Atenção: nas edições **já publicadas**, cada vez que guarda um artigo a alteração vai logo para o site (também em 2 a 3 minutos).

## 11. Se algo não parecer bem

- No canto do editor de texto há um botão que mostra o texto “em bruto” (Markdown). Não precisa de o usar; se o abrir sem querer, carregue outra vez para voltar.
- Os artigos antigos foram convertidos do PDF e podem ter blocos especiais. Pode corrigir gralhas à vontade; para mudanças maiores num artigo antigo, fale primeiro com o Miguel.
- Não apague nem mude o nome de imagens que já estejam em artigos publicados.

## Cábula de LaTeX

Escreva o que está na coluna da esquerda (sem os cifrões, se usar **Inserir → Fórmula**).

| Escreve | Aparece |
| --- | --- |
| `\frac{3}{4}` | $\frac{3}{4}$ (fração) |
| `\dfrac{a+b}{2}` | $\dfrac{a+b}{2}$ (fração grande) |
| `x^2`, `2^{10}` | $x^2$, $2^{10}$ (potências: com mais de um algarismo, use chavetas) |
| `a_1`, `a_{n+1}` | $a_1$, $a_{n+1}$ (índices) |
| `\sqrt{2}`, `\sqrt[3]{8}` | $\sqrt{2}$, $\sqrt[3]{8}$ (raízes) |
| `3 \times 4`, `12 : 3` | $3 \times 4$, $12 : 3$ (vezes e dividir) |
| `\leq`, `\geq`, `\neq`, `\approx` | $\leq$, $\geq$, $\neq$, $\approx$ |
| `\pi`, `\alpha`, `\Delta` | $\pi$, $\alpha$, $\Delta$ (letras gregas) |
| `3{,}14` | $3{,}14$ (vírgula decimal sem espaço a mais) |
| `90^\circ` | $90^\circ$ (graus) |
| `\overline{AB}` | $\overline{AB}$ (segmento) |
| `\sum_{k=1}^{n} k` | $\sum_{k=1}^{n} k$ (somatório) |
| `\binom{5}{2}` | $\binom{5}{2}$ (combinações) |
| `\begin{cases} x + y = 5 \\ x - y = 1 \end{cases}` | sistema de duas equações, com chaveta |
| `\text{ cm}` | texto normal dentro de uma fórmula |

Dica: para um espaço maior dentro de uma fórmula use `\quad`.
