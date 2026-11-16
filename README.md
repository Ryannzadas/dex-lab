# Dex Lab

Montador de time e comparador de Pokémon, feito com dados da [PokéAPI](https://pokeapi.co).

## O que faz

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

#### Vários times e Showdown

- **Meus times:** guarde vários times no navegador, cada um com nome, e crie, troque, renomeie, duplique ou exclua quando quiser.
- **Importar do Showdown:** cole um time no formato de texto do Pokémon Showdown e ele vira um time novo, com apelido, item, habilidade, nível, shiny, Tipo Tera, EVs, natureza, IVs e golpes. O que não for reconhecido aparece como aviso.
- **Exportar:** gera o texto do time aberto para colar no Teambuilder do Showdown.
- **Link compartilhado:** quem abre um link de time ganha ele como um time novo na lista, sem perder os seus.

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

Tem tema claro e escuro. Por padrão, segue o do sistema.

## Referências de design

- [react-spring.dev](https://www.react-spring.dev/): as manchas de cor desfocadas no fundo, que aqui mudam de cor conforme os tipos do time, e a barra de ícones do menu. As animações de mola também vêm da biblioteca React Spring.
- [gsap.com](https://gsap.com/): o título grande com as palavras entrando em cascata, os textos entre chaves `{ }` e os botões em pílula com seta num círculo.

## Rodando

```bash
npm install
npm run dev
```

Feito com Vite, React 19, TypeScript, Tailwind CSS v4 e React Spring.

---

Projeto de fã, sem fins lucrativos. Pokémon e seus personagens são marcas da Nintendo, Game Freak e Creatures. Este projeto não tem afiliação com eles. Desenvolvido por [Hydra Labs](https://hydra-labs-studio.vercel.app).
