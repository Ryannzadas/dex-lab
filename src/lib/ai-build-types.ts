/** Formato da conversa entre o editor e a função /api/ajustar-build (assistente com o Claude). */

export type AiStatKey = "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export type AiBuild = {
  moves: string[];
  item: string;
  nature: string;
  ability: string | null;
  tera: string | null;
  evs: Record<AiStatKey, number>;
};

export type AiBuildRequest = {
  /** O que o jogador pediu, em português. */
  pedido: string;
  pokemon: {
    name: string;
    types: string[];
    stats: Record<AiStatKey, number>;
    abilities: { name: string; hidden: boolean }[];
  };
  game: { label: string; gen: number; kind: "official" | "hack"; tera: boolean } | null;
  level: number;
  style: "casual" | "competitiva";
  current: AiBuild;
  /** Golpes que ele pode ter neste jogo, com a forma de aprender ("Nv 36", "TM", "tutor", "ovo", "pré-evolução"). */
  learnable: { id: string; how: string }[];
  /** Líderes e Liga do jogo (para o estilo casual). */
  bosses: { name: string; types: string[]; levelCap: number }[];
  teammates: { name: string; types: string[] }[];
};

export type AiBuildResponse =
  | {
      ok: true;
      resposta: string;
      alterou: boolean;
      patch: Partial<AiBuild>;
      /** Coisas que o servidor corrigiu na sugestão (golpe que não existe no jogo, EVs demais…). */
      avisos: string[];
      restantes: number;
    }
  | { ok: false; erro: string };
