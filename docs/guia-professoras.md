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

1. Em **Edições**, carregue em **Novo**.
2. Preencha:
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

Na edição seguinte, para publicar a resolução de um desafio antigo, abra esse artigo e preencha a **Resolução** desse desafio.

## 7. Outros blocos do menu Inserir

- **Nota (caixa amarela)**: um texto em destaque.
- **Caixa “ver mais”**: texto escondido que abre com um clique (por exemplo, uma resolução passo a passo).
- **Jogo ou animação**: os jogos interativos do site (Triângulo de Pascal, Collatz, Monty Hall, Arranha-céus).

## 8. Publicar

Cada vez que carrega em **Guardar**, a alteração fica gravada e o site atualiza-se sozinho **em 2 a 3 minutos**. Não é preciso fazer mais nada.

Conselho: prepare a edição toda e confira-a na pré-visualização antes de guardar o último artigo. Os artigos guardados ficam logo visíveis no site.

## 9. Se algo não parecer bem

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
