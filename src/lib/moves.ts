import { isTypeName, type TypeName } from "./types";

export type MoveInfo = {
  name: string;
  type: TypeName | null;
  /** physical = físico, special = especial, status = sem dano. */
  category: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

const cache = new Map<string, Promise<MoveInfo>>();

/** Detalhes de um golpe (tipo, categoria e poder), com cache. */
export function getMove(name: string): Promise<MoveInfo> {
  const hit = cache.get(name);
  if (hit) return hit;
  const promise = fetch(`https://pokeapi.co/api/v2/move/${name}`)
    .then((res) => {
      if (!res.ok) throw new Error(`PokéAPI ${res.status}`);
      return res.json() as Promise<{
        name: string;
        type: { name: string };
        damage_class: { name: MoveInfo["category"] };
        power: number | null;
        accuracy: number | null;
        pp: number | null;
      }>;
    })
    .then((m) => ({
      name: m.name,
      type: isTypeName(m.type.name) ? m.type.name : null,
      category: m.damage_class.name,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
    }));
  promise.catch(() => cache.delete(name));
  cache.set(name, promise);
  return promise;
}

export const CATEGORY_PT: Record<MoveInfo["category"], string> = {
  physical: "Físico",
  special: "Especial",
  status: "Status",
};

/** Itens mais usados em times, para sugerir no campo (o campo aceita qualquer texto). */
export const COMMON_ITEMS = [
  "Leftovers",
  "Life Orb",
  "Choice Band",
  "Choice Specs",
  "Choice Scarf",
  "Focus Sash",
  "Assault Vest",
  "Rocky Helmet",
  "Heavy-Duty Boots",
  "Eviolite",
  "Black Sludge",
  "Sitrus Berry",
  "Lum Berry",
  "Expert Belt",
  "Weakness Policy",
  "Light Clay",
  "Booster Energy",
  "Covert Cloak",
  "Clear Amulet",
  "Loaded Dice",
  "Mirror Herb",
  "White Herb",
  "Air Balloon",
  "Toxic Orb",
  "Flame Orb",
  "Mystic Water",
  "Charcoal",
  "Miracle Seed",
  "Magnet",
  "Never-Melt Ice",
  "Soft Sand",
  "Sharp Beak",
  "Twisted Spoon",
  "Black Glasses",
  "Dragon Fang",
  "Spell Tag",
  "Metal Coat",
  "Silk Scarf",
  "Muscle Band",
  "Wise Glasses",
];

export const TERA_TYPES: (TypeName | "stellar")[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
  "stellar",
];
