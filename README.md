# Dex Lab

Montador de time e comparador de Pokémon, feito com dados da [PokéAPI](https://pokeapi.co).

## O que faz

### Aba Time

Você escolhe até seis Pokémon e o app mostra:

- a **tabela de fraquezas**, com o dano de cada tipo de ataque em cada membro;
- os **pontos fracos** do time, que são os tipos de ataque que pegam mais gente fraca do que protegida;
- a **cobertura de ataque**, com quais tipos os golpes do mesmo tipo do time acertam super efetivo;
- uma **sugestão** de tipo para o próximo membro.

### Aba Comparar

Você coloca de dois a quatro Pokémon lado a lado e compara:

- os status base, com o maior valor destacado;
- o total;
- habilidades, incluindo as ocultas;
- altura, peso e cadeia de evolução.

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
