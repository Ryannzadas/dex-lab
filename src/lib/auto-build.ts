import type { Game } from "./games";
import type { Pokemon, StatKey } from "./pokeapi";
import type { Member } from "./team";
import { multiplier, typesOfGen, type TypeName } from "./types";

export type BuildStyle = "casual" | "competitiva";

type RankedMove = {
  name: string;
  type: TypeName;
  category: "physical" | "special" | "status";
  score: number;
  /** Só faz sentido no modo competitivo (ex.: Stealth Rock, Volt Switch, Protect). */
  compOnly?: boolean;
};

/**
 * Banco dos melhores golpes de Pokémon (físicos, especiais e de suporte/setup),
 * com tipo, categoria e nota de prioridade. Usado para montar builds instantaneamente
 * filtrando apenas os golpes que o Pokémon realmente aprende no jogo escolhido.
 */
const BEST_MOVES: RankedMove[] = [
  // Normal
  { name: "extreme-speed", type: "normal", category: "physical", score: 94 },
  { name: "body-slam", type: "normal", category: "physical", score: 88 },
  { name: "return", type: "normal", category: "physical", score: 89 },
  { name: "double-edge", type: "normal", category: "physical", score: 90 },
  { name: "facade", type: "normal", category: "physical", score: 85 },
  { name: "quick-attack", type: "normal", category: "physical", score: 72 },
  { name: "fake-out", type: "normal", category: "physical", score: 84, compOnly: true },
  { name: "rapid-spin", type: "normal", category: "physical", score: 83, compOnly: true },
  { name: "boomburst", type: "normal", category: "special", score: 98 },
  { name: "hyper-voice", type: "normal", category: "special", score: 90 },
  { name: "tri-attack", type: "normal", category: "special", score: 84 },
  { name: "Population-bomb", type: "normal", category: "physical", score: 95 },
  { name: "blood-moon", type: "normal", category: "special", score: 98 },

  // Fire
  { name: "flamethrower", type: "fire", category: "special", score: 94 },
  { name: "fire-blast", type: "fire", category: "special", score: 90 },
  { name: "torch-song", type: "fire", category: "special", score: 98 },
  { name: "armor-cannon", type: "fire", category: "special", score: 96 },
  { name: "heat-wave", type: "fire", category: "special", score: 91 },
  { name: "overheat", type: "fire", category: "special", score: 88 },
  { name: "lava-plume", type: "fire", category: "special", score: 86 },
  { name: "fiery-dance", type: "fire", category: "special", score: 94 },
  { name: "flare-blitz", type: "fire", category: "physical", score: 95 },
  { name: "bitter-blade", type: "fire", category: "physical", score: 97 },
  { name: "pyro-ball", type: "fire", category: "physical", score: 96 },
  { name: "sacred-fire", type: "fire", category: "physical", score: 96 },
  { name: "fire-punch", type: "fire", category: "physical", score: 85 },
  { name: "fire-fang", type: "fire", category: "physical", score: 78 },
  { name: "blaze-kick", type: "fire", category: "physical", score: 83 },

  // Water
  { name: "surf", type: "water", category: "special", score: 94 },
  { name: "scald", type: "water", category: "special", score: 93 },
  { name: "hydro-pump", type: "water", category: "special", score: 90 },
  { name: "muddy-water", type: "water", category: "special", score: 84 },
  { name: "water-pulse", type: "water", category: "special", score: 75 },
  { name: "liquidation", type: "water", category: "physical", score: 93 },
  { name: "waterfall", type: "water", category: "physical", score: 92 },
  { name: "wave-crash", type: "water", category: "physical", score: 94 },
  { name: "aqua-step", type: "water", category: "physical", score: 96 },
  { name: "surging-strikes", type: "water", category: "physical", score: 97 },
  { name: "aqua-jet", type: "water", category: "physical", score: 82 },
  { name: "flip-turn", type: "water", category: "physical", score: 86, compOnly: true },
  { name: "crabhammer", type: "water", category: "physical", score: 88 },
  { name: "aqua-tail", type: "water", category: "physical", score: 86 },

  // Electric
  { name: "thunderbolt", type: "electric", category: "special", score: 95 },
  { name: "discharge", type: "electric", category: "special", score: 87 },
  { name: "thunder", type: "electric", category: "special", score: 86 },
  { name: "volt-switch", type: "electric", category: "special", score: 89, compOnly: true },
  { name: "electro-drift", type: "electric", category: "special", score: 98 },
  { name: "thunderclap", type: "electric", category: "special", score: 95 },
  { name: "wild-charge", type: "electric", category: "physical", score: 89 },
  { name: "supercell-slam", type: "electric", category: "physical", score: 91 },
  { name: "plasma-fists", type: "electric", category: "physical", score: 96 },
  { name: "zing-zap", type: "electric", category: "physical", score: 88 },
  { name: "thunder-punch", type: "electric", category: "physical", score: 85 },
  { name: "thunder-fang", type: "electric", category: "physical", score: 78 },

  // Grass
  { name: "energy-ball", type: "grass", category: "special", score: 93 },
  { name: "giga-drain", type: "grass", category: "special", score: 92 },
  { name: "leaf-storm", type: "grass", category: "special", score: 89 },
  { name: "matcha-gotcha", type: "grass", category: "special", score: 94 },
  { name: "petal-dance", type: "grass", category: "special", score: 84 },
  { name: "leaf-blade", type: "grass", category: "physical", score: 93 },
  { name: "wood-hammer", type: "grass", category: "physical", score: 93 },
  { name: "flower-trick", type: "grass", category: "physical", score: 97 },
  { name: "grassy-glide", type: "grass", category: "physical", score: 90 },
  { name: "horn-leech", type: "grass", category: "physical", score: 89 },
  { name: "seed-bomb", type: "grass", category: "physical", score: 87 },
  { name: "power-whip", type: "grass", category: "physical", score: 90 },
  { name: "bullet-seed", type: "grass", category: "physical", score: 80 },

  // Ice
  { name: "ice-beam", type: "ice", category: "special", score: 95 },
  { name: "freeze-dry", type: "ice", category: "special", score: 94 },
  { name: "blizzard", type: "ice", category: "special", score: 86 },
  { name: "icy-wind", type: "ice", category: "special", score: 78, compOnly: true },
  { name: "icicle-crash", type: "ice", category: "physical", score: 92 },
  { name: "ice-spinner", type: "ice", category: "physical", score: 91 },
  { name: "triple-axel", type: "ice", category: "physical", score: 93 },
  { name: "icicle-spear", type: "ice", category: "physical", score: 85 },
  { name: "ice-punch", type: "ice", category: "physical", score: 86 },
  { name: "ice-shard", type: "ice", category: "physical", score: 85 },
  { name: "ice-fang", type: "ice", category: "physical", score: 78 },

  // Fighting
  { name: "close-combat", type: "fighting", category: "physical", score: 96 },
  { name: "drain-punch", type: "fighting", category: "physical", score: 91 },
  { name: "sacred-sword", type: "fighting", category: "physical", score: 92 },
  { name: "collision-course", type: "fighting", category: "physical", score: 98 },
  { name: "high-jump-kick", type: "fighting", category: "physical", score: 91 },
  { name: "superpower", type: "fighting", category: "physical", score: 89 },
  { name: "brick-break", type: "fighting", category: "physical", score: 86 },
  { name: "cross-chop", type: "fighting", category: "physical", score: 85 },
  { name: "body-press", type: "fighting", category: "physical", score: 90 },
  { name: "mach-punch", type: "fighting", category: "physical", score: 84 },
  { name: "aura-sphere", type: "fighting", category: "special", score: 92 },
  { name: "focus-blast", type: "fighting", category: "special", score: 86 },
  { name: "vacuum-wave", type: "fighting", category: "special", score: 82 },

  // Poison
  { name: "sludge-bomb", type: "poison", category: "special", score: 93 },
  { name: "sludge-wave", type: "poison", category: "special", score: 94 },
  { name: "malignant-chain", type: "poison", category: "special", score: 96 },
  { name: "gunk-shot", type: "poison", category: "physical", score: 92 },
  { name: "dire-claw", type: "poison", category: "physical", score: 94 },
  { name: "poison-jab", type: "poison", category: "physical", score: 90 },
  { name: "cross-poison", type: "poison", category: "physical", score: 83 },

  // Ground
  { name: "earthquake", type: "ground", category: "physical", score: 97 },
  { name: "headlong-rush", type: "ground", category: "physical", score: 96 },
  { name: "precipice-blades", type: "ground", category: "physical", score: 96 },
  { name: "high-horsepower", type: "ground", category: "physical", score: 90 },
  { name: "drill-run", type: "ground", category: "physical", score: 86 },
  { name: "earth-power", type: "ground", category: "special", score: 94 },
  { name: "scorching-sands", type: "ground", category: "special", score: 86 },

  // Flying
  { name: "brave-bird", type: "flying", category: "physical", score: 95 },
  { name: "dual-wingbeat", type: "flying", category: "physical", score: 88 },
  { name: "acrobatics", type: "flying", category: "physical", score: 89 },
  { name: "drill-peck", type: "flying", category: "physical", score: 87 },
  { name: "aerial-ace", type: "flying", category: "physical", score: 80 },
  { name: "fly", type: "flying", category: "physical", score: 82 },
  { name: "hurricane", type: "flying", category: "special", score: 90 },
  { name: "bleakwind-storm", type: "flying", category: "special", score: 92 },
  { name: "aeroblast", type: "flying", category: "special", score: 94 },
  { name: "oblivion-wing", type: "flying", category: "special", score: 95 },
  { name: "air-slash", type: "flying", category: "special", score: 89 },

  // Psychic
  { name: "psychic", type: "psychic", category: "special", score: 95 },
  { name: "psyshock", type: "psychic", category: "special", score: 92 },
  { name: "psystrike", type: "psychic", category: "special", score: 97 },
  { name: "Expanding-force", type: "psychic", category: "special", score: 91 },
  { name: "lumina-crash", type: "psychic", category: "special", score: 95 },
  { name: "extrasensory", type: "psychic", category: "special", score: 82 },
  { name: "psychic-fangs", type: "psychic", category: "physical", score: 90 },
  { name: "psycho-cut", type: "psychic", category: "physical", score: 85 },
  { name: "zen-headbutt", type: "psychic", category: "physical", score: 86 },

  // Bug
  { name: "u-turn", type: "bug", category: "physical", score: 91 },
  { name: "first-impression", type: "bug", category: "physical", score: 90 },
  { name: "leech-life", type: "bug", category: "physical", score: 90 },
  { name: "megahorn", type: "bug", category: "physical", score: 91 },
  { name: "x-scissor", type: "bug", category: "physical", score: 87 },
  { name: "bug-buzz", type: "bug", category: "special", score: 92 },
  { name: "pollen-puff", type: "bug", category: "special", score: 90 },
  { name: "signal-beam", type: "bug", category: "special", score: 82 },

  // Rock
  { name: "stone-edge", type: "rock", category: "physical", score: 92 },
  { name: "rock-slide", type: "rock", category: "physical", score: 90 },
  { name: "head-smash", type: "rock", category: "physical", score: 92 },
  { name: "salt-cure", type: "rock", category: "physical", score: 94 },
  { name: "accelerock", type: "rock", category: "physical", score: 82 },
  { name: "rock-tomb", type: "rock", category: "physical", score: 78 },
  { name: "power-gem", type: "rock", category: "special", score: 89 },
  { name: "meteor-beam", type: "rock", category: "special", score: 90 },
  { name: "ancient-power", type: "rock", category: "special", score: 76 },

  // Ghost
  { name: "shadow-ball", type: "ghost", category: "special", score: 95 },
  { name: "astral-barrage", type: "ghost", category: "special", score: 99 },
  { name: "hex", type: "ghost", category: "special", score: 84 },
  { name: "poltergeist", type: "ghost", category: "physical", score: 93 },
  { name: "rage-fist", type: "ghost", category: "physical", score: 97 },
  { name: "last-respects", type: "ghost", category: "physical", score: 96 },
  { name: "shadow-claw", type: "ghost", category: "physical", score: 87 },
  { name: "phantom-force", type: "ghost", category: "physical", score: 86 },
  { name: "shadow-sneak", type: "ghost", category: "physical", score: 83 },

  // Dragon
  { name: "draco-meteor", type: "dragon", category: "special", score: 94 },
  { name: "dragon-pulse", type: "dragon", category: "special", score: 91 },
  { name: "spacial-rend", type: "dragon", category: "special", score: 95 },
  { name: "fickle-beam", type: "dragon", category: "special", score: 92 },
  { name: "outrage", type: "dragon", category: "physical", score: 93 },
  { name: "glaive-rush", type: "dragon", category: "physical", score: 96 },
  { name: "dragon-darts", type: "dragon", category: "physical", score: 96 },
  { name: "scale-shot", type: "dragon", category: "physical", score: 91 },
  { name: "dragon-claw", type: "dragon", category: "physical", score: 91 },

  // Dark
  { name: "knock-off", type: "dark", category: "physical", score: 95 },
  { name: "crunch", type: "dark", category: "physical", score: 91 },
  { name: "kowtow-cleave", type: "dark", category: "physical", score: 95 },
  { name: "sucker-punch", type: "dark", category: "physical", score: 90 },
  { name: "ceaseless-edge", type: "dark", category: "physical", score: 94 },
  { name: "wicked-blow", type: "dark", category: "physical", score: 97 },
  { name: "night-slash", type: "dark", category: "physical", score: 85 },
  { name: "foul-play", type: "dark", category: "physical", score: 87, compOnly: true },
  { name: "dark-pulse", type: "dark", category: "special", score: 92 },
  { name: "snarl", type: "dark", category: "special", score: 80, compOnly: true },

  // Steel
  { name: "iron-head", type: "steel", category: "physical", score: 92 },
  { name: "gigaton-hammer", type: "steel", category: "physical", score: 98 },
  { name: "meteor-mash", type: "steel", category: "physical", score: 93 },
  { name: "heavy-slam", type: "steel", category: "physical", score: 88 },
  { name: "bullet-punch", type: "steel", category: "physical", score: 86 },
  { name: "flash-cannon", type: "steel", category: "special", score: 92 },
  { name: "make-it-rain", type: "steel", category: "special", score: 98 },
  { name: "tachyon-cutter", type: "steel", category: "special", score: 95 },

  // Fairy
  { name: "moonblast", type: "fairy", category: "special", score: 96 },
  { name: "dazzling-gleam", type: "fairy", category: "special", score: 90 },
  { name: "draining-kiss", type: "fairy", category: "special", score: 82 },
  { name: "play-rough", type: "fairy", category: "physical", score: 92 },
  { name: "spirit-break", type: "fairy", category: "physical", score: 89 },
];

const SETUP_PHYSICAL = ["dragon-dance", "swords-dance", "bulk-up", "shell-smash", "shift-gear", "victory-dance", "belly-drum"];
const SETUP_SPECIAL = ["quiver-dance", "nasty-plot", "calm-mind", "tail-glow", "shell-smash", "torch-song", "take-heart"];
const RECOVERY_MOVES = ["recover", "roost", "slack-off", "soft-boiled", "synthesis", "moonlight", "morning-sun", "wish"];
const COMP_UTILITY = ["stealth-rock", "spikes", "toxic-spikes", "sticky-web", "Encore", "taunt", "will-o-wisp", "thunder-wave", "spore", "toxic", "protect", "defog"];

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
 * Gera uma sugestão completa de build (Campanha Casual ou Competitiva) para um Pokémon
 * respeitando as regras e golpes do jogo escolhido.
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

  // 1. Natureza
  let nature = "hardy";
  if (hasAbilities) {
    if (isTank) {
      nature = def >= spd ? (atk >= spa ? "impish" : "bold") : atk >= spa ? "careful" : "calm";
    } else if (prefCat === "physical") {
      nature = spe >= 80 ? "jolly" : "adamant";
    } else {
      nature = spe >= 80 ? "timid" : "modest";
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
  } else if (spe >= 72) {
    evs[prefCat === "physical" ? "attack" : "special-attack"] = 252;
    evs.speed = 252;
    evs.hp = 4;
  } else {
    // Atacante mais lento/parrudo: investe em HP + Ataque/At.Esp
    evs.hp = 252;
    evs[prefCat === "physical" ? "attack" : "special-attack"] = 252;
    evs.speed = 4;
  }

  // 3. Habilidade
  let ability: string | null = null;
  if (hasAbilities && pokemon.abilities.length > 0) {
    if (style === "casual") {
      // No casual, prioriza habilidades normais (não ocultas) fortes ou a primeira habilidade normal.
      const normalAbilities = pokemon.abilities.filter((a) => !a.hidden);
      const topNormal = normalAbilities.find((a) => TOP_ABILITIES.has(a.name));
      ability = (topNormal ?? normalAbilities[0] ?? pokemon.abilities[0]).name;
    } else {
      // No competitivo, considera também habilidades ocultas de topo.
      const topAny = pokemon.abilities.find((a) => TOP_ABILITIES.has(a.name));
      ability = (topAny ?? pokemon.abilities[0]).name;
    }
  }

  // 4. Item segurado
  let item = "";
  if (hasItems) {
    const primaryType = pokemon.types[0];
    const rockMult = multiplier("rock", pokemon.types, gen);
    if (style === "casual") {
      if (isTank) {
        item = pokemon.types.includes("poison") && gen >= 4 ? "Black Sludge" : "Leftovers";
      } else if (gen <= 3) {
        item = CASUAL_TYPE_ITEM[primaryType] ?? "Leftovers";
      } else {
        item = prefCat === "physical" ? "Muscle Band" : "Wise Glasses";
        if (pokemon.types.length >= 2) item = "Expert Belt";
      }
    } else {
      // Competitivo
      if (rockMult >= 2 && gen >= 8) {
        item = "Heavy-Duty Boots";
      } else if (isTank) {
        item = pokemon.types.includes("poison") && gen >= 4 ? "Black Sludge" : "Leftovers";
      } else if (spe >= 95) {
        item = "Life Orb";
      } else if (spe >= 80) {
        item = prefCat === "physical" ? "Choice Band" : "Choice Specs";
      } else {
        item = "Leftovers";
      }
    }
  }

  // 5. Golpes (até 4, dentre os que o Pokémon aprende no jogo)
  const learnSet = new Set(learnset);
  const pickedMoves: string[] = [];
  const coveredAttackTypes = new Set<TypeName>();

  const candidates = BEST_MOVES.filter((m) => {
    if (!learnSet.has(m.name)) return false;
    if (!validTypes.has(m.type)) return false;
    if (style === "casual" && m.compOnly) return false;
    return true;
  }).map((m) => {
    const isStab = pokemon.types.includes(m.type);
    const matchesCat = m.category === prefCat;
    const mixedOk = Math.abs(atk - spa) <= 20;
    const catBonus = matchesCat ? 22 : mixedOk ? 10 : -18;
    const stabBonus = isStab ? 26 : 0;
    return { ...m, total: m.score + stabBonus + catBonus };
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

  // Passo B: 1 golpe de setup ou recuperação/utilidade (no competitivo ou se aprender um setup clássico).
  const setupPool = prefCat === "physical" ? SETUP_PHYSICAL : SETUP_SPECIAL;
  const bestSetup = setupPool.find((m) => learnSet.has(m) && !pickedMoves.includes(m));
  const bestRecovery = RECOVERY_MOVES.find((m) => learnSet.has(m) && !pickedMoves.includes(m));
  const bestUtility = COMP_UTILITY.find((m) => learnSet.has(m) && !pickedMoves.includes(m));

  // Passo C: preenche com os melhores golpes de cobertura de tipos diferentes.
  const targetAttacks = style === "competitiva" ? (isTank ? 2 : 3) : bestSetup && !isTank ? 3 : 4;
  for (const c of candidates) {
    if (pickedMoves.length >= targetAttacks) break;
    if (pickedMoves.includes(c.name)) continue;
    if (coveredAttackTypes.has(c.type)) continue;
    pickedMoves.push(c.name);
    coveredAttackTypes.add(c.type);
  }

  // Passo D: adiciona setup/recuperação/utilidade nas vagas restantes.
  if (pickedMoves.length < 4) {
    if (isTank) {
      if (bestRecovery && pickedMoves.length < 4) pickedMoves.push(bestRecovery);
      if (bestUtility && pickedMoves.length < 4) pickedMoves.push(bestUtility);
    } else if (bestSetup && pickedMoves.length < 4) {
      pickedMoves.push(bestSetup);
    } else if (style === "competitiva" && bestRecovery && pickedMoves.length < 4) {
      pickedMoves.push(bestRecovery);
    }
  }

  // Passo E: se ainda faltar até 4 golpes, completa com os melhores restantes da lista ou do learnset.
  for (const c of candidates) {
    if (pickedMoves.length >= 4) break;
    if (!pickedMoves.includes(c.name)) pickedMoves.push(c.name);
  }
  for (const m of learnset) {
    if (pickedMoves.length >= 4) break;
    if (!pickedMoves.includes(m)) pickedMoves.push(m);
  }

  // 6. Tipo Tera
  const tera = hasTera ? pokemon.types[0] : null;

  return {
    nature,
    ability,
    item,
    moves: pickedMoves.slice(0, 4),
    evs,
    tera,
  };
}
