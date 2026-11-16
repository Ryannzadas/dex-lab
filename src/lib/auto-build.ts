import type { Game } from "./games";
import type { Pokemon, StatKey } from "./pokeapi";
import type { Member } from "./team";
import { multiplier, typesOfGen, type TypeName } from "./types";

export type BuildStyle = "casual" | "competitiva";

type RankedMove = {
  name: string;
  type: TypeName;
  category: "physical" | "special" | "status";
  /** Nota para jogar a campanha (prioriza 100% de precisão, muito PP e sem efeito negativo). */
  casualScore: number;
  /** Nota para competitivo (prioriza poder máximo, pivots, prioridades e Knock Off/Close Combat). */
  compScore: number;
  compOnly?: boolean;
};

/**
 * Banco de golpes separados por perfil:
 * - `casualScore`: prefere golpes 100% precisos e sem queda de status (Flamethrower, Surf, Thunderbolt, Dragon Claw, Psychic…);
 * - `compScore`: prefere nukes de alto impacto, pivots e prioridades (Fire Blast, Draco Meteor, Hydro Pump, U-turn, Volt Switch, Knock Off, Extreme Speed…).
 */
const BEST_MOVES: RankedMove[] = [
  // Normal
  { name: "extreme-speed", type: "normal", category: "physical", casualScore: 84, compScore: 97 },
  { name: "body-slam", type: "normal", category: "physical", casualScore: 93, compScore: 85 },
  { name: "return", type: "normal", category: "physical", casualScore: 95, compScore: 88 },
  { name: "double-edge", type: "normal", category: "physical", casualScore: 80, compScore: 94 },
  { name: "facade", type: "normal", category: "physical", casualScore: 78, compScore: 92 },
  { name: "quick-attack", type: "normal", category: "physical", casualScore: 76, compScore: 82 },
  { name: "fake-out", type: "normal", category: "physical", casualScore: 70, compScore: 93, compOnly: true },
  { name: "rapid-spin", type: "normal", category: "physical", casualScore: 70, compScore: 92, compOnly: true },
  { name: "boomburst", type: "normal", category: "special", casualScore: 96, compScore: 99 },
  { name: "hyper-voice", type: "normal", category: "special", casualScore: 92, compScore: 90 },
  { name: "tri-attack", type: "normal", category: "special", casualScore: 88, compScore: 82 },
  { name: "population-bomb", type: "normal", category: "physical", casualScore: 90, compScore: 97 },
  { name: "blood-moon", type: "normal", category: "special", casualScore: 95, compScore: 99 },

  // Fire
  { name: "flamethrower", type: "fire", category: "special", casualScore: 97, compScore: 89 },
  { name: "fire-blast", type: "fire", category: "special", casualScore: 80, compScore: 96 },
  { name: "overheat", type: "fire", category: "special", casualScore: 76, compScore: 95 },
  { name: "torch-song", type: "fire", category: "special", casualScore: 98, compScore: 98 },
  { name: "armor-cannon", type: "fire", category: "special", casualScore: 94, compScore: 97 },
  { name: "heat-wave", type: "fire", category: "special", casualScore: 88, compScore: 93 },
  { name: "lava-plume", type: "fire", category: "special", casualScore: 89, compScore: 90 },
  { name: "fiery-dance", type: "fire", category: "special", casualScore: 95, compScore: 95 },
  { name: "flare-blitz", type: "fire", category: "physical", casualScore: 85, compScore: 97 },
  { name: "bitter-blade", type: "fire", category: "physical", casualScore: 97, compScore: 97 },
  { name: "pyro-ball", type: "fire", category: "physical", casualScore: 93, compScore: 96 },
  { name: "sacred-fire", type: "fire", category: "physical", casualScore: 94, compScore: 97 },
  { name: "fire-punch", type: "fire", category: "physical", casualScore: 92, compScore: 83 },
  { name: "blaze-kick", type: "fire", category: "physical", casualScore: 88, compScore: 81 },
  { name: "fire-fang", type: "fire", category: "physical", casualScore: 82, compScore: 75 },

  // Water
  { name: "surf", type: "water", category: "special", casualScore: 97, compScore: 88 },
  { name: "scald", type: "water", category: "special", casualScore: 91, compScore: 95 },
  { name: "hydro-pump", type: "water", category: "special", casualScore: 78, compScore: 96 },
  { name: "muddy-water", type: "water", category: "special", casualScore: 84, compScore: 82 },
  { name: "water-pulse", type: "water", category: "special", casualScore: 78, compScore: 70 },
  { name: "waterfall", type: "water", category: "physical", casualScore: 95, compScore: 88 },
  { name: "liquidation", type: "water", category: "physical", casualScore: 94, compScore: 93 },
  { name: "wave-crash", type: "water", category: "physical", casualScore: 83, compScore: 97 },
  { name: "aqua-step", type: "water", category: "physical", casualScore: 96, compScore: 96 },
  { name: "surging-strikes", type: "water", category: "physical", casualScore: 97, compScore: 98 },
  { name: "aqua-jet", type: "water", category: "physical", casualScore: 78, compScore: 91 },
  { name: "flip-turn", type: "water", category: "physical", casualScore: 72, compScore: 95, compOnly: true },
  { name: "crabhammer", type: "water", category: "physical", casualScore: 88, compScore: 87 },
  { name: "aqua-tail", type: "water", category: "physical", casualScore: 86, compScore: 82 },

  // Electric
  { name: "thunderbolt", type: "electric", category: "special", casualScore: 97, compScore: 92 },
  { name: "discharge", type: "electric", category: "special", casualScore: 90, compScore: 86 },
  { name: "thunder", type: "electric", category: "special", casualScore: 76, compScore: 90 },
  { name: "volt-switch", type: "electric", category: "special", casualScore: 74, compScore: 96, compOnly: true },
  { name: "electro-drift", type: "electric", category: "special", casualScore: 98, compScore: 98 },
  { name: "thunderclap", type: "electric", category: "special", casualScore: 90, compScore: 97 },
  { name: "thunder-punch", type: "electric", category: "physical", casualScore: 92, compScore: 83 },
  { name: "wild-charge", type: "electric", category: "physical", casualScore: 84, compScore: 91 },
  { name: "supercell-slam", type: "electric", category: "physical", casualScore: 82, compScore: 93 },
  { name: "plasma-fists", type: "electric", category: "physical", casualScore: 96, compScore: 96 },
  { name: "zing-zap", type: "electric", category: "physical", casualScore: 91, compScore: 89 },
  { name: "thunder-fang", type: "electric", category: "physical", casualScore: 82, compScore: 74 },

  // Grass
  { name: "energy-ball", type: "grass", category: "special", casualScore: 96, compScore: 89 },
  { name: "giga-drain", type: "grass", category: "special", casualScore: 95, compScore: 92 },
  { name: "leaf-storm", type: "grass", category: "special", casualScore: 76, compScore: 96 },
  { name: "matcha-gotcha", type: "grass", category: "special", casualScore: 94, compScore: 95 },
  { name: "petal-dance", type: "grass", category: "special", casualScore: 84, compScore: 78 },
  { name: "leaf-blade", type: "grass", category: "physical", casualScore: 95, compScore: 90 },
  { name: "seed-bomb", type: "grass", category: "physical", casualScore: 92, compScore: 85 },
  { name: "wood-hammer", type: "grass", category: "physical", casualScore: 83, compScore: 95 },
  { name: "power-whip", type: "grass", category: "physical", casualScore: 80, compScore: 94 },
  { name: "flower-trick", type: "grass", category: "physical", casualScore: 97, compScore: 97 },
  { name: "grassy-glide", type: "grass", category: "physical", casualScore: 84, compScore: 94 },
  { name: "horn-leech", type: "grass", category: "physical", casualScore: 91, compScore: 88 },
  { name: "bullet-seed", type: "grass", category: "physical", casualScore: 78, compScore: 86 },

  // Ice
  { name: "ice-beam", type: "ice", category: "special", casualScore: 97, compScore: 93 },
  { name: "freeze-dry", type: "ice", category: "special", casualScore: 91, compScore: 96 },
  { name: "blizzard", type: "ice", category: "special", casualScore: 76, compScore: 89 },
  { name: "icy-wind", type: "ice", category: "special", casualScore: 72, compScore: 86, compOnly: true },
  { name: "ice-punch", type: "ice", category: "physical", casualScore: 93, compScore: 84 },
  { name: "ice-spinner", type: "ice", category: "physical", casualScore: 94, compScore: 92 },
  { name: "icicle-crash", type: "ice", category: "physical", casualScore: 89, compScore: 94 },
  { name: "triple-axel", type: "ice", category: "physical", casualScore: 82, compScore: 96 },
  { name: "icicle-spear", type: "ice", category: "physical", casualScore: 80, compScore: 89 },
  { name: "ice-shard", type: "ice", category: "physical", casualScore: 80, compScore: 92 },
  { name: "ice-fang", type: "ice", category: "physical", casualScore: 82, compScore: 75 },

  // Fighting
  { name: "drain-punch", type: "fighting", category: "physical", casualScore: 95, compScore: 90 },
  { name: "brick-break", type: "fighting", category: "physical", casualScore: 92, compScore: 80 },
  { name: "sacred-sword", type: "fighting", category: "physical", casualScore: 94, compScore: 91 },
  { name: "close-combat", type: "fighting", category: "physical", casualScore: 88, compScore: 98 },
  { name: "collision-course", type: "fighting", category: "physical", casualScore: 97, compScore: 98 },
  { name: "high-jump-kick", type: "fighting", category: "physical", casualScore: 80, compScore: 94 },
  { name: "superpower", type: "fighting", category: "physical", casualScore: 78, compScore: 90 },
  { name: "cross-chop", type: "fighting", category: "physical", casualScore: 82, compScore: 84 },
  { name: "body-press", type: "fighting", category: "physical", casualScore: 86, compScore: 94 },
  { name: "mach-punch", type: "fighting", category: "physical", casualScore: 80, compScore: 91 },
  { name: "aura-sphere", type: "fighting", category: "special", casualScore: 96, compScore: 88 },
  { name: "focus-blast", type: "fighting", category: "special", casualScore: 74, compScore: 94 },
  { name: "vacuum-wave", type: "fighting", category: "special", casualScore: 78, compScore: 89 },

  // Poison
  { name: "sludge-bomb", type: "poison", category: "special", casualScore: 95, compScore: 92 },
  { name: "sludge-wave", type: "poison", category: "special", casualScore: 92, compScore: 95 },
  { name: "malignant-chain", type: "poison", category: "special", casualScore: 96, compScore: 96 },
  { name: "poison-jab", type: "poison", category: "physical", casualScore: 94, compScore: 88 },
  { name: "gunk-shot", type: "poison", category: "physical", casualScore: 80, compScore: 95 },
  { name: "dire-claw", type: "poison", category: "physical", casualScore: 94, compScore: 94 },
  { name: "cross-poison", type: "poison", category: "physical", casualScore: 88, compScore: 80 },

  // Ground
  { name: "earthquake", type: "ground", category: "physical", casualScore: 98, compScore: 97 },
  { name: "headlong-rush", type: "ground", category: "physical", casualScore: 88, compScore: 98 },
  { name: "precipice-blades", type: "ground", category: "physical", casualScore: 92, compScore: 97 },
  { name: "high-horsepower", type: "ground", category: "physical", casualScore: 91, compScore: 91 },
  { name: "drill-run", type: "ground", category: "physical", casualScore: 88, compScore: 85 },
  { name: "earth-power", type: "ground", category: "special", casualScore: 96, compScore: 94 },
  { name: "scorching-sands", type: "ground", category: "special", casualScore: 86, compScore: 89 },

  // Flying
  { name: "drill-peck", type: "flying", category: "physical", casualScore: 93, compScore: 85 },
  { name: "dual-wingbeat", type: "flying", category: "physical", casualScore: 90, compScore: 89 },
  { name: "acrobatics", type: "flying", category: "physical", casualScore: 91, compScore: 90 },
  { name: "brave-bird", type: "flying", category: "physical", casualScore: 86, compScore: 97 },
  { name: "aerial-ace", type: "flying", category: "physical", casualScore: 85, compScore: 74 },
  { name: "fly", type: "flying", category: "physical", casualScore: 88, compScore: 70 },
  { name: "air-slash", type: "flying", category: "special", casualScore: 95, compScore: 87 },
  { name: "hurricane", type: "flying", category: "special", casualScore: 78, compScore: 95 },
  { name: "bleakwind-storm", type: "flying", category: "special", casualScore: 88, compScore: 94 },
  { name: "aeroblast", type: "flying", category: "special", casualScore: 94, compScore: 94 },
  { name: "oblivion-wing", type: "flying", category: "special", casualScore: 96, compScore: 95 },

  // Psychic
  { name: "psychic", type: "psychic", category: "special", casualScore: 97, compScore: 92 },
  { name: "psyshock", type: "psychic", category: "special", casualScore: 88, compScore: 95 },
  { name: "psystrike", type: "psychic", category: "special", casualScore: 97, compScore: 98 },
  { name: "expanding-force", type: "psychic", category: "special", casualScore: 89, compScore: 94 },
  { name: "lumina-crash", type: "psychic", category: "special", casualScore: 95, compScore: 96 },
  { name: "extrasensory", type: "psychic", category: "special", casualScore: 84, compScore: 78 },
  { name: "psychic-fangs", type: "psychic", category: "physical", casualScore: 93, compScore: 91 },
  { name: "zen-headbutt", type: "psychic", category: "physical", casualScore: 88, compScore: 85 },
  { name: "psycho-cut", type: "psychic", category: "physical", casualScore: 90, compScore: 82 },

  // Bug
  { name: "x-scissor", type: "bug", category: "physical", casualScore: 93, compScore: 84 },
  { name: "leech-life", type: "bug", category: "physical", casualScore: 94, compScore: 89 },
  { name: "u-turn", type: "bug", category: "physical", casualScore: 78, compScore: 97 },
  { name: "first-impression", type: "bug", category: "physical", casualScore: 84, compScore: 94 },
  { name: "megahorn", type: "bug", category: "physical", casualScore: 85, compScore: 93 },
  { name: "bug-buzz", type: "bug", category: "special", casualScore: 95, compScore: 92 },
  { name: "pollen-puff", type: "bug", category: "special", casualScore: 91, compScore: 91 },
  { name: "signal-beam", type: "bug", category: "special", casualScore: 85, compScore: 78 },

  // Rock
  { name: "rock-slide", type: "rock", category: "physical", casualScore: 94, compScore: 88 },
  { name: "stone-edge", type: "rock", category: "physical", casualScore: 82, compScore: 95 },
  { name: "head-smash", type: "rock", category: "physical", casualScore: 78, compScore: 94 },
  { name: "salt-cure", type: "rock", category: "physical", casualScore: 88, compScore: 96 },
  { name: "accelerock", type: "rock", category: "physical", casualScore: 82, compScore: 88 },
  { name: "rock-tomb", type: "rock", category: "physical", casualScore: 80, compScore: 78 },
  { name: "power-gem", type: "rock", category: "special", casualScore: 93, compScore: 89 },
  { name: "meteor-beam", type: "rock", category: "special", casualScore: 78, compScore: 93 },
  { name: "ancient-power", type: "rock", category: "special", casualScore: 80, compScore: 74 },

  // Ghost
  { name: "shadow-ball", type: "ghost", category: "special", casualScore: 97, compScore: 95 },
  { name: "astral-barrage", type: "ghost", category: "special", casualScore: 99, compScore: 99 },
  { name: "hex", type: "ghost", category: "special", casualScore: 80, compScore: 91 },
  { name: "shadow-claw", type: "ghost", category: "physical", casualScore: 93, compScore: 85 },
  { name: "poltergeist", type: "ghost", category: "physical", casualScore: 82, compScore: 96 },
  { name: "rage-fist", type: "ghost", category: "physical", casualScore: 96, compScore: 97 },
  { name: "last-respects", type: "ghost", category: "physical", casualScore: 90, compScore: 97 },
  { name: "phantom-force", type: "ghost", category: "physical", casualScore: 88, compScore: 84 },
  { name: "shadow-sneak", type: "ghost", category: "physical", casualScore: 80, compScore: 91 },

  // Dragon
  { name: "dragon-pulse", type: "dragon", category: "special", casualScore: 96, compScore: 88 },
  { name: "draco-meteor", type: "dragon", category: "special", casualScore: 78, compScore: 97 },
  { name: "spacial-rend", type: "dragon", category: "special", casualScore: 95, compScore: 95 },
  { name: "fickle-beam", type: "dragon", category: "special", casualScore: 92, compScore: 93 },
  { name: "dragon-claw", type: "dragon", category: "physical", casualScore: 96, compScore: 89 },
  { name: "outrage", type: "dragon", category: "physical", casualScore: 84, compScore: 94 },
  { name: "scale-shot", type: "dragon", category: "physical", casualScore: 80, compScore: 95 },
  { name: "glaive-rush", type: "dragon", category: "physical", casualScore: 93, compScore: 97 },
  { name: "dragon-darts", type: "dragon", category: "physical", casualScore: 96, compScore: 96 },

  // Dark
  { name: "crunch", type: "dark", category: "physical", casualScore: 95, compScore: 88 },
  { name: "knock-off", type: "dark", category: "physical", casualScore: 86, compScore: 98 },
  { name: "kowtow-cleave", type: "dark", category: "physical", casualScore: 95, compScore: 95 },
  { name: "sucker-punch", type: "dark", category: "physical", casualScore: 80, compScore: 95 },
  { name: "ceaseless-edge", type: "dark", category: "physical", casualScore: 90, compScore: 96 },
  { name: "wicked-blow", type: "dark", category: "physical", casualScore: 97, compScore: 97 },
  { name: "night-slash", type: "dark", category: "physical", casualScore: 90, compScore: 82 },
  { name: "foul-play", type: "dark", category: "physical", casualScore: 74, compScore: 91, compOnly: true },
  { name: "dark-pulse", type: "dark", category: "special", casualScore: 95, compScore: 92 },
  { name: "snarl", type: "dark", category: "special", casualScore: 76, compScore: 88, compOnly: true },

  // Steel
  { name: "iron-head", type: "steel", category: "physical", casualScore: 95, compScore: 92 },
  { name: "gigaton-hammer", type: "steel", category: "physical", casualScore: 97, compScore: 98 },
  { name: "meteor-mash", type: "steel", category: "physical", casualScore: 92, compScore: 94 },
  { name: "heavy-slam", type: "steel", category: "physical", casualScore: 85, compScore: 90 },
  { name: "bullet-punch", type: "steel", category: "physical", casualScore: 82, compScore: 93 },
  { name: "flash-cannon", type: "steel", category: "special", casualScore: 95, compScore: 92 },
  { name: "make-it-rain", type: "steel", category: "special", casualScore: 94, compScore: 98 },
  { name: "tachyon-cutter", type: "steel", category: "special", casualScore: 95, compScore: 95 },

  // Fairy
  { name: "moonblast", type: "fairy", category: "special", casualScore: 97, compScore: 96 },
  { name: "dazzling-gleam", type: "fairy", category: "special", casualScore: 92, compScore: 89 },
  { name: "draining-kiss", type: "fairy", category: "special", casualScore: 84, compScore: 84 },
  { name: "play-rough", type: "fairy", category: "physical", casualScore: 94, compScore: 92 },
  { name: "spirit-break", type: "fairy", category: "physical", casualScore: 92, compScore: 89 },
];

const SETUP_PHYSICAL = ["dragon-dance", "swords-dance", "bulk-up", "shell-smash", "shift-gear", "victory-dance", "belly-drum"];
const SETUP_SPECIAL = ["quiver-dance", "nasty-plot", "calm-mind", "tail-glow", "shell-smash", "torch-song", "take-heart"];
const RECOVERY_MOVES = ["recover", "roost", "slack-off", "soft-boiled", "synthesis", "moonlight", "morning-sun", "wish"];
const COMP_UTILITY = [
  "stealth-rock",
  "spikes",
  "will-o-wisp",
  "thunder-wave",
  "spore",
  "taunt",
  "encore",
  "toxic",
  "defog",
  "protect",
  "substitute",
];

/** Habilidades competitivas muito fortes quando disponíveis no Pokémon. */
const TOP_ABILITIES = new Set([
  "intimidate",
  "levitate",
  "regenerator",
  "speed-boost",
  "multiscale",
  "magic-guard",
  "sheer-force",
  "technician",
  "adaptability",
  "protean",
  "libero",
  "moxie",
  "beast-boost",
  "supreme-overlord",
  "good-as-gold",
  "purifying-salt",
  "unaware",
  "prankster",
  "drought",
  "drizzle",
  "sand-stream",
  "snow-warning",
  "electric-surge",
  "grassy-surge",
  "psychic-surge",
  "misty-surge",
  "huge-power",
  "pure-power",
  "guts",
  "marvel-scale",
  "natural-cure",
  "serene-grace",
  "contrary",
  "defiant",
  "competitive",
  "sharpness",
  "earth-eater",
  "toxic-debris",
  "rough-skin",
  "iron-barbs",
  "flame-body",
  "static",
  "flash-fire",
  "water-absorb",
  "volt-absorb",
  "sap-sipper",
  "storm-drain",
  "lightning-rod",
  "thick-fat",
  "sturdy",
]);

/** Item de campanha por tipo principal (fácil de achar durante a história e sem efeito negativo). */
const CASUAL_TYPE_ITEM: Record<TypeName, string> = {
  normal: "Silk Scarf",
  fire: "Charcoal",
  water: "Mystic Water",
  electric: "Magnet",
  grass: "Miracle Seed",
  ice: "Never-Melt Ice",
  fighting: "Expert Belt",
  poison: "Black Sludge",
  ground: "Soft Sand",
  flying: "Sharp Beak",
  psychic: "Twisted Spoon",
  bug: "Expert Belt",
  rock: "Hard Stone",
  ghost: "Spell Tag",
  dragon: "Dragon Fang",
  dark: "Black Glasses",
  steel: "Metal Coat",
  fairy: "Wise Glasses",
};

/**
 * Gera uma sugestão completa de build:
 * - `casual` (Campanha): 4 ataques de tipos variados com 100% de precisão e alto PP, item de campanha sem efeito negativo e habilidade normal;
 * - `competitiva`: nukes de alto poder, pivots/prioridades, golpes de setup/hazard/recuperação, habilidade oculta/meta e item competitivo.
 */
export function buildSuggestedMember({
  pokemon,
  learnset,
  game,
  style,
}: {
  pokemon: Pokemon;
  learnset: string[];
  game: Game | null;
  style: BuildStyle;
}): Partial<Member> {
  const gen = game?.gen ?? 9;
  const hasAbilities = gen >= 3;
  const hasItems = gen >= 2;
  const hasTera = !game || game.tera;
  const validTypes = new Set(typesOfGen(gen));

  const stat = (k: StatKey) => pokemon.stats.find((s) => s.key === k)?.value ?? 50;
  const atk = stat("attack");
  const def = stat("defense");
  const spa = stat("special-attack");
  const spd = stat("special-defense");
  const spe = stat("speed");

  const isTank = def + spd >= (atk + spa) * 1.32 && Math.max(atk, spa) < 95;
  const isPhysical = atk >= spa + 10;
  const isSpecial = spa >= atk + 10;
  const prefCat: "physical" | "special" = isPhysical ? "physical" : isSpecial ? "special" : atk >= spa ? "physical" : "special";

  const learnSet = new Set(learnset);
  const setupPool = prefCat === "physical" ? SETUP_PHYSICAL : SETUP_SPECIAL;
  const bestSetup = setupPool.find((m) => learnSet.has(m));
  const bestRecovery = RECOVERY_MOVES.find((m) => learnSet.has(m));
  const bestUtility = COMP_UTILITY.find((m) => learnSet.has(m));

  // 1. Natureza (no casual prioriza +Atq/+At.Esp para bater forte na campanha; no competitivo prioriza +Vel quando spe >= 78).
  let nature = "hardy";
  if (hasAbilities) {
    if (isTank) {
      nature = def >= spd ? (atk >= spa ? "impish" : "bold") : atk >= spa ? "careful" : "calm";
    } else if (style === "casual") {
      nature = prefCat === "physical" ? (spe >= 100 ? "jolly" : "adamant") : spe >= 100 ? "timid" : "modest";
    } else {
      nature = prefCat === "physical" ? (spe >= 78 ? "jolly" : "adamant") : spe >= 78 ? "timid" : "modest";
    }
  }

  // 2. EVs
  const evs: Partial<Record<StatKey, number>> = {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  };
  if (isTank) {
    evs.hp = 252;
    if (def >= spd) {
      evs.defense = 252;
      evs["special-defense"] = 4;
    } else {
      evs["special-defense"] = 252;
      evs.defense = 4;
    }
  } else if (spe >= 72 || style === "competitiva") {
    evs[prefCat === "physical" ? "attack" : "special-attack"] = 252;
    evs.speed = 252;
    evs.hp = 4;
  } else {
    evs.hp = 252;
    evs[prefCat === "physical" ? "attack" : "special-attack"] = 252;
    evs.speed = 4;
  }

  // 3. Habilidade
  let ability: string | null = null;
  if (hasAbilities && pokemon.abilities.length > 0) {
    if (style === "casual") {
      const normalAbilities = pokemon.abilities.filter((a) => !a.hidden);
      const topNormal = normalAbilities.find((a) => TOP_ABILITIES.has(a.name));
      ability = (topNormal ?? normalAbilities[0] ?? pokemon.abilities[0]).name;
    } else {
      const topHidden = pokemon.abilities.find((a) => a.hidden && TOP_ABILITIES.has(a.name));
      const topAny = pokemon.abilities.find((a) => TOP_ABILITIES.has(a.name));
      ability = (topHidden ?? topAny ?? pokemon.abilities[0]).name;
    }
  }

  // 4. Item segurado
  let item = "";
  let isChoiceItem = false;
  if (hasItems) {
    const primaryType = pokemon.types[0];
    const rockMult = multiplier("rock", pokemon.types, gen);
    if (style === "casual") {
      if (isTank) {
        item = pokemon.types.includes("poison") && gen >= 4 ? "Black Sludge" : "Leftovers";
      } else if (gen <= 3) {
        item = CASUAL_TYPE_ITEM[primaryType] ?? "Leftovers";
      } else {
        item = pokemon.types.length >= 2 ? "Expert Belt" : prefCat === "physical" ? "Muscle Band" : "Wise Glasses";
      }
    } else {
      if (rockMult >= 2 && gen >= 8) {
        item = "Heavy-Duty Boots";
      } else if (isTank) {
        item = pokemon.types.includes("poison") && gen >= 4 ? "Black Sludge" : "Leftovers";
      } else if (bestSetup) {
        item = "Life Orb";
      } else if (spe >= 82) {
        item = prefCat === "physical" ? "Choice Band" : "Choice Specs";
        isChoiceItem = true;
      } else {
        item = "Leftovers";
      }
    }
  }

  // 5. Golpes: casual monta 4 ataques consistentes de tipos variados; competitivo usa nukes + setup/utilidade/pivots.
  const pickedMoves: string[] = [];
  const coveredAttackTypes = new Set<TypeName>();

  const candidates = BEST_MOVES.filter((m) => {
    if (!learnSet.has(m.name)) return false;
    if (!validTypes.has(m.type)) return false;
    if (style === "casual" && m.compOnly) return false;
    return true;
  }).map((m) => {
    const baseScore = style === "casual" ? m.casualScore : m.compScore;
    const isStab = pokemon.types.includes(m.type);
    const matchesCat = m.category === prefCat;
    const mixedOk = Math.abs(atk - spa) <= 20;
    const catBonus = matchesCat ? 22 : mixedOk ? 10 : -18;
    const stabBonus = isStab ? 26 : 0;
    return { ...m, total: baseScore + stabBonus + catBonus };
  });

  candidates.sort((a, b) => b.total - a.total);

  // Passo A: garante o melhor golpe STAB de cada tipo do Pokémon.
  for (const t of pokemon.types) {
    if (!validTypes.has(t)) continue;
    const bestStab = candidates.find((c) => c.type === t && !pickedMoves.includes(c.name));
    if (bestStab && pickedMoves.length < 2) {
      pickedMoves.push(bestStab.name);
      coveredAttackTypes.add(bestStab.type);
    }
  }

  if (style === "casual") {
    // Casual: 4 ataques de tipos diferentes (máxima cobertura na campanha, sem precisar gastar turno com hazards/setup).
    for (const c of candidates) {
      if (pickedMoves.length >= 4) break;
      if (pickedMoves.includes(c.name)) continue;
      if (coveredAttackTypes.has(c.type)) continue;
      pickedMoves.push(c.name);
      coveredAttackTypes.add(c.type);
    }
  } else {
    // Competitiva: se não for item Choice, reserva 1–2 vagas para setup, recuperação ou hazard/status.
    const tacticalMoves: string[] = [];
    if (!isChoiceItem) {
      if (isTank) {
        if (bestRecovery) tacticalMoves.push(bestRecovery);
        if (bestUtility && !tacticalMoves.includes(bestUtility)) tacticalMoves.push(bestUtility);
      } else {
        if (bestSetup) tacticalMoves.push(bestSetup);
        if (bestRecovery && tacticalMoves.length === 0) tacticalMoves.push(bestRecovery);
        else if (bestUtility && tacticalMoves.length < 2 && (!bestSetup || isTank)) tacticalMoves.push(bestUtility);
      }
    }

    const attackSlots = Math.max(2, 4 - tacticalMoves.length);
    for (const c of candidates) {
      if (pickedMoves.length >= attackSlots) break;
      if (pickedMoves.includes(c.name)) continue;
      if (coveredAttackTypes.has(c.type) && !c.compOnly) continue;
      pickedMoves.push(c.name);
      coveredAttackTypes.add(c.type);
    }

    for (const tm of tacticalMoves) {
      if (pickedMoves.length >= 4) break;
      if (!pickedMoves.includes(tm)) pickedMoves.push(tm);
    }
  }

  // Completa até 4 caso ainda sobre espaço.
  for (const c of candidates) {
    if (pickedMoves.length >= 4) break;
    if (!pickedMoves.includes(c.name)) pickedMoves.push(c.name);
  }
  for (const m of learnset) {
    if (pickedMoves.length >= 4) break;
    if (!pickedMoves.includes(m)) pickedMoves.push(m);
  }

  // 6. Tipo Tera (no casual usa o tipo principal; no competitivo escolhe um tipo defensivo ou de cobertura se for fraco a Pedra).
  let tera: string | null = null;
  if (hasTera) {
    if (style === "competitiva" && multiplier("rock", pokemon.types, gen) >= 2) {
      tera = "water";
    } else {
      tera = pokemon.types[0];
    }
  }

  return {
    nature,
    ability,
    item,
    moves: pickedMoves.slice(0, 4),
    evs,
    tera,
  };
}
