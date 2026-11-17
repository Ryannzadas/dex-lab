# Dex Lab

Montador de time e comparador de Pokémon, feito com dados da [PokéAPI](https://pokeapi.co).

## O que faz

### Tela inicial e jogos

A tela inicial é a porta de entrada:

- **Continuar:** volta ao último time mexido, que aparece com os Pokémon dele em arco.
- **Novo time:** comece um time para um **jogo específico** escolhendo o card dele, com filtro por geração. Também dá pra montar um time livre.

Cada time salvo pode ter um jogo, que dá pra trocar no card "Meus times":

- **Jogos oficiais (do Red/Blue ao Legends: Z-A):** usam os dados da PokéAPI.
  - **Quem entra:** só Pokémon da Pokédex daquele jogo (com DLCs) e as formas que existem nele (Mega, regionais, Gigantamax…). O resto aparece bloqueado na busca, na Pokédex e no resumo.
  - **Golpes:** os que cada Pokémon aprende naquele jogo.
  - **Regras da época:** tipos antigos de cada Pokémon (ex.: Gardevoir só Psíquica antes da 6ª geração), tabela de tipos da geração (sem Fada antes da 6ª, sem Sombrio e Aço na 1ª, Aço resistindo a Fantasma e Sombrio até a 5ª), e só os campos que existiam (habilidade e natureza a partir da 3ª, item a partir da 2ª, Tera só em Scarlet/Violet).
- **ROM hacks (Radical Red, Unbound e Quetzal):** em "modo hack".
  - **Por que é diferente:** a PokéAPI não tem os dados desses jogos, então o app usa só as gerações que cada hack inclui e as regras modernas.
  - **Só avisa:** Pokémon fora disso aparecem com o aviso "pode não existir", sem bloqueio. Os golpes são os do Scarlet/Violet, como referência.

### Aba Time

Você escolhe até seis Pokémon e o app mostra:

- a **tabela de fraquezas**, com o dano de cada tipo de ataque em cada membro;
- os **pontos fracos** do time, que são os tipos de ataque que pegam mais gente fraca do que protegida;
- a **cobertura de ataque**, com quais tipos os golpes do mesmo tipo do time acertam super efetivo;
- uma **sugestão** de tipo para o próximo membro.

#### Configurar cada membro

Clique num membro do time para abrir o editor dele (inspirado no montador da Firma League). Dá pra definir:

- apelido, nível, habilidade, item, natureza (em português, com o status que sobe e o que desce) e Tipo Tera;
- shiny;
- **4 golpes**, só entre os que o Pokémon aprende, mostrando tipo, categoria, poder e precisão;
- no **modo avançado**, EVs (até 252 por status, 510 no total) e IVs, com os **status finais** calculados pela fórmula oficial.

Com golpes escolhidos, a cobertura da análise passa a usar os **golpes de dano** do time e avisa quem ainda está sem golpe. A configuração inteira vai junto no link de compartilhar.

#### Calculadora de dano

Escolha um golpe de um membro do time e um Pokémon alvo para ver o dano:

- **O que entra na conta:** fórmula oficial com nível, natureza, EVs, IVs, STAB (com Tera), efetividade e itens (Life Orb, Choice Band/Specs, Expert Belt).
- **Alvo:** o investimento dele é escolhido entre três opções prontas.
- **Resultado:** a faixa em % da vida, a barra de HP e o veredito (OHKO garantido, chance de OHKO, 2HKO…).
- **O que fica de fora:** habilidades, clima, campo e críticos.

#### Velocidade e Tera

- **Quem ataca primeiro:** escada com a velocidade final de cada membro (nível, natureza, EVs, IVs e Choice Scarf) ao lado da velocidade máxima de Pokémon comuns no competitivo, como Dragapult, Flutter Mane e Garchomp.
- **Com Tera:** botão na tabela de fraquezas que mostra a defesa do time depois de terastalizar. Quem tem Tipo Tera passa a defender só com ele. O resumo de pontos fracos acompanha.

#### Vários times e Showdown

- **Meus times:** guarde vários times no navegador, cada um com nome, e crie, troque, renomeie, duplique ou exclua quando quiser.
- **Importar do Showdown:** cole um time no formato de texto do Pokémon Showdown e ele vira um time novo, com apelido, item, habilidade, nível, shiny, Tipo Tera, EVs, natureza, IVs e golpes. O que não for reconhecido aparece como aviso.
- **Exportar:** gera o texto do time aberto para colar no Teambuilder do Showdown.
- **Link compartilhado:** quem abre um link de time ganha ele como um time novo na lista, sem perder os seus.
- **Imagem do time:** gera um card de 1200×675 com o time inteiro (arte, shiny, nível, natureza, tipos, item e golpes) para baixar em PNG ou copiar e colar no Discord.

### Builds automáticas

No editor de cada membro, dois botões montam a build sozinhos e explicam cada escolha no quadro "Por que essa build":

- **Build casual (campanha):** calculada pelo app. Ele mede o dano real de cada golpe que o Pokémon já pode ter no nível atual (poder, precisão, STAB, atributo, recuo, recarga, dois turnos, quedas de atributo, PP), sem golpes de ovo, e escolhe a combinação que mais bate nos líderes e na Liga do jogo do time. Tipos que o resto do time não cobre pesam mais. O item é o que fortalece o golpe mais forte.
- **Build competitiva:** usa um set real da [Smogon](https://www.smogon.com/dex/) da geração do jogo (formatos individuais, do OU ao Little Cup), com golpes, item, natureza, EVs, IVs e Tipo Tera. Cada golpe é conferido no que o Pokémon aprende naquele jogo, incluindo pré-evoluções; o que não existir é trocado pelo melhor ataque calculado. Sem set (pré-evoluções, formas raras, ROM hacks de geração anterior), a build é calculada.
- **Até a 3ª geração**, físico ou especial depende do tipo do golpe, como nos jogos da época.
- Dados: sets da Smogon pelo projeto [pkmn](https://github.com/pkmn/smogon) e dados dos golpes do Pokémon Showdown, guardados para uso offline.
- **Pedir à IA:** um campo livre para explicar ou ajustar a build em português ("deixa ele mais rápido", "sem golpes de recuo", "quero aguentar a Elite 4"), no estilo campanha ou competitivo. Usa o modelo aberto gpt-oss-120b no plano gratuito do [Groq](https://groq.com/), com saída estruturada. A IA recebe o Pokémon, o jogo, a build atual, os golpes que ele aprende naquele jogo, os líderes e o resto do time. O servidor confere a resposta antes de aplicar: golpe que ele não aprende, EVs acima de 510, habilidade, natureza, item ou Tera de outra geração são corrigidos e avisados. Dá pra desfazer o ajuste.

### Aba Comparar

Você coloca de dois a quatro Pokémon lado a lado e compara:

- os status base, com o maior valor destacado;
- o total;
- habilidades, incluindo as ocultas;
- altura, peso e cadeia de evolução.

### Aba Pokédex

Todos os 1.025 Pokémon numa grade, com:

- **Filtros:** busca por nome ou número, por **região** (Kanto a Paldea) e por **tipo**. Dá pra combinar dois tipos, como Fogo + Voador.
- **Formas:** opção para mostrar também as formas regionais, Mega e Gigantamax.
- **Atalhos:** clicar num card abre o resumo, e o botão **+** coloca o Pokémon direto no time aberto.

Os filtros ficam no link (`?aba=pokedex&regiao=kanto&tipo=fire`). Os tipos de todos os Pokémon vêm de 18 pedidos à PokéAPI (um por tipo) e ficam guardados no navegador por 7 dias.

### Resumo de cada Pokémon

Clique num Pokémon do time ou no nome dele na comparação para abrir o resumo. O resumo traz:

- **Formas:** abas para cada uma (Normal, Mega X/Y, Gigantamax, Alola, Galar…).
- **Arte e som:** a arte oficial com botão pra ver a versão **shiny** e o **grito** do Pokémon.
- **Dados:** categoria, altura, peso, habilidades e descrição da Pokédex.
- **Batalha:** status base e fraquezas/resistências agrupadas.
- **Evolução:** a cadeia completa, com a condição de cada etapa.
- **Golpes:** separados por nível, TM, ovo e tutor.

O link de cada resumo é próprio (`?pokemon=6`), e o botão "voltar" do navegador fecha o resumo.

### Compartilhar

O time e a comparação ficam salvos no navegador e no link (`?time=6,9,3`). É só mandar a URL.

### Tema

O botão do menu alterna entre **claro**, **escuro** e **do sistema**. No modo "do sistema", o site acompanha o tema do aparelho e muda sozinho junto com ele.

### Instalar como app

O Dex Lab é um PWA: no celular, use "Adicionar à tela inicial"; no computador, use o ícone de instalar na barra de endereço. Ele abre como app, e o que já foi visto (Pokémon, golpes, imagens e fontes) continua funcionando sem internet.

## Referências de design

- [react-spring.dev](https://www.react-spring.dev/): as manchas de cor desfocadas no fundo, que aqui mudam de cor conforme os tipos do time, e a barra de ícones do menu. As animações de mola também vêm da biblioteca React Spring.
- [awwwards.com](https://www.awwwards.com/) e [horizonx.so](https://horizonx.so/) (tela inicial): grade de cards grandes com legenda embaixo e contadores em caixinha; os Pokémon do último time num arco em perspectiva.
- [gsap.com](https://gsap.com/): o título grande com as palavras entrando em cascata, os textos entre chaves `{ }` e os botões em pílula com seta num círculo.

## Conta e sincronização

Entrar com a conta (Google) é opcional e serve para os times aparecerem em todos os aparelhos. Sem login, tudo continua salvo só no navegador.

- Ao entrar, os times do aparelho se juntam aos da nuvem sem perder nada: se o mesmo time foi mexido nos dois lugares, vale a versão mais recente. Times excluídos somem também nos outros aparelhos.
- Depois disso, cada mudança sobe sozinha, e o app busca as novidades quando você volta para ele. A bolinha no avatar mostra se está tudo sincronizado.
- No menu da conta, "Apagar meus dados da nuvem" remove os times guardados e sai da conta (o aparelho mantém a cópia dele).
- Só os times ficam guardados, ligados ao id da conta. Login com Google pelo [Firebase Authentication](https://firebase.google.com/products/auth) e dados no [Upstash Redis](https://upstash.com/) (pela Vercel Marketplace). O Firebase só é carregado depois que o app abre.

Variáveis na Vercel: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` (configuração pública do app Web no Firebase, com `dex-lab.vercel.app` nos domínios autorizados), mais `KV_REST_API_URL` / `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) criadas pela integração do Upstash. O servidor confere o token do Firebase com as chaves públicas do Google, sem chave secreta. Com o Redis configurado, o limite de perguntas da IA também passa a ser contado nele, exato entre todas as instâncias.

## Assistente de IA (configuração)

A função `api/ajustar-build.ts` roda na Vercel e chama a API do Groq. Variáveis de ambiente do projeto na Vercel:

| Variável | Para quê |
| --- | --- |
| `GROQ_API_KEY` | Chave da API do Groq (console.groq.com, plano gratuito). Sem ela, o painel avisa que o assistente não está configurado. |
| `IA_LIMITE_POR_PESSOA` | Perguntas por pessoa por dia (padrão 10). |
| `IA_LIMITE_DIARIO` | Perguntas por dia no total, por instância da função (padrão 500). |
| `IA_MODELO` | Opcional: outro modelo do Groq com saída estruturada estrita (padrão `openai/gpt-oss-120b`). |

Os limites ficam na memória da função, então servem para frear abuso. O plano gratuito do Groq também tem limite próprio por dia; quando ele acaba, o painel pede para tentar mais tarde.

## Rodando

```bash
npm install
npm run dev
```

Feito com Vite, React 19, TypeScript, Tailwind CSS v4 e React Spring.

---

Projeto de fã, sem fins lucrativos. Pokémon e seus personagens são marcas da Nintendo, Game Freak e Creatures. Este projeto não tem afiliação com eles. Desenvolvido por [Hydra Labs](https://hydra-labs-studio.vercel.app).
