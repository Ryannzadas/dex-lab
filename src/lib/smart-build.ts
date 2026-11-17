import { buildSuggestedMember, type BuildStyle } from "./auto-build";
import { bossesForGame } from "./bosses";
import { getMoveData, getSmogonSets, sdId, type SdMove, type SdSet } from "./build-data";
import type { Game } from "./games";
import { displayName, getPokemon, movesFor, pokemonName, preEvolutionIds, speciesIdOf, typesInGen, type LearnedMove, type Pokemon, type StatKey } from "./pokeapi";
import { toApiName } from "./showdown";
import type { Member } from "./team";
import { multiplier, TYPE_INFO, typesOfGen, type TypeName } from "./types";

/**
 * Gerador de builds "inteligente":
 * - Competitiva: usa um set real da Smogon da geração do jogo e confere cada golpe no learnset daquele jogo.
 *   Sem set (pré-evoluções, formas raras, hacks), calcula a build.
 * - Casual (campanha): calcula o dano real de cada golpe que o Pokémon já pode ter no nível dele
 *   e escolhe a combinação que mais bate nos líderes e na Liga do jogo, cobrindo os buracos do time.
 * Toda escolha vem com o motivo, para o jogador entender a build.
 */

export type BuildReason = { label: string; text: string };

export type SmartBuild = {
  patch: Partial<Member>;
  /** De onde veio: set da Smogon ou calculada pelo app. */
  source: { kind: "smogon"; format: string; setName: string } | { kind: "calculada" } | { kind: "simples" };
  reasons: BuildReason[];
};

type Target = { type: TypeName; weight: number; who: string[] };

type Candidate = {
  name: string; // nome da PokéAPI (slug)
  type: TypeName;
  category: "physical" | "special";
  /** Dano esperado relativo deste golpe neste Pokémon (poder × precisão × STAB × atributo × penalidades). */
  power: number;
  notes: string[];
  source: string; // "Nv 36", "TM", "tutor"
};

const SD_STAT: Record<string, StatKey> = {
  hp: "hp",
  atk: "attack",
  def: "defense",
  spa: "special-attack",
  spd: "special-defense",
  spe: "speed",
};

/** Até a 3ª geração, físico/especial dependia do tipo do golpe. */
const PHYSICAL_TYPES_OLD = new Set<TypeName>(["normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel"]);

/** Golpes com condição especial ou dano imprevisível: não valem para uma build automática. */
const SKIP_MOVES = new Set([
  "fake-out", "focus-punch", "dream-eater", "belch", "last-resort", "snore", "synchronoise", "future-sight", "doom-desire",
  "natural-gift", "fling", "spit-up", "endeavor", "final-gambit", "counter", "mirror-coat", "metal-burst", "bide", "present",
  "magnitude", "steel-beam", "mind-blown", "burn-up", "double-shock", "hidden-power", "frustration", "trump-card", "sky-drop",
  "self-destruct", "explosion", "misty-explosion", "memento", "struggle", "beat-up", "pay-day", "false-swipe", "hold-back",
  "rollout", "ice-ball", "uproar", "stomping-tantrum", "dragon-rage", "sonic-boom", "super-fang", "natures-madness", "ruination",
  "psywave", "guillotine", "horn-drill", "fissure", "sheer-cold", "first-impression", "upper-hand", "poltergeist", "dig", "dive",
  "bounce", "phantom-force", "shadow-force", "fly", "foul-play", "body-press",
]);

/** Golpe especial que cada forma do Rotom ganha ao trocar de forma (a PokéAPI não lista). */
const FORM_SIGNATURE: Record<string, string> = {
  "rotom-wash": "hydro-pump", "rotom-heat": "overheat", "rotom-frost": "blizzard", "rotom-fan": "air-slash", "rotom-mow": "leaf-storm",
};

/**
 * Tudo o que o Pokémon pode saber neste jogo: os golpes dele, os das pré-evoluções (golpes de ovo e
 * de nível que só a forma anterior aprende) e os da forma base. A PokéAPI lista só os da própria forma.
 */
export async function fullLearnable(pokemon: Pokemon, learned: LearnedMove[], versionGroup: string | null): Promise<Set<string>> {
  const names = new Set(learned.map((m) => m.name));
  const extraIds = await preEvolutionIds(pokemon).catch(() => [] as number[]);
  if (pokemon.id > 1025) extraIds.push(speciesIdOf(pokemon));
  const others = await Promise.all(extraIds.map((id) => getPokemon(id).catch(() => null)));
  for (const p of others) if (p) for (const m of movesFor(p, versionGroup).moves) names.add(m.name);
  if (FORM_SIGNATURE[pokemon.name]) names.add(FORM_SIGNATURE[pokemon.name]);
  return names;
}

const SETUP: Record<"physical" | "special", string[]> = {
  physical: ["dragon-dance", "swords-dance", "bulk-up", "shell-smash", "victory-dance", "shift-gear", "coil", "howl"],
  special: ["quiver-dance", "nasty-plot", "calm-mind", "tail-glow", "shell-smash", "take-heart", "growth"],
};

const TYPE_ITEM: Record<TypeName, string> = {
  normal: "Silk Scarf", fire: "Charcoal", water: "Mystic Water", electric: "Magnet", grass: "Miracle Seed",
  ice: "Never-Melt Ice", fighting: "Black Belt", poison: "Poison Barb", ground: "Soft Sand", flying: "Sharp Beak",
  psychic: "Twisted Spoon", bug: "Silver Powder", rock: "Hard Stone", ghost: "Spell Tag", dragon: "Dragon Fang",
  dark: "Black Glasses", steel: "Metal Coat", fairy: "Fairy Feather",
};

/** Formatos de batalha individual (sem duplas, VGC ou formatos de brincadeira), na ordem de preferência. */
const SINGLES = ["ou", "ubers", "uu", "ru", "nu", "pu", "zu", "ubersuu", "nationaldex", "nationaldexuu", "nationaldexubers", "uber", "letsgoou", "lgpeou", "lc", "nfe"];
const HACK_SINGLES = ["nationaldex", "nationaldexuu", "nationaldexubers", ...SINGLES];

const FORMAT_LABEL: Record<string, string> = {
  ou: "OU", ubers: "Ubers", uber: "Ubers", uu: "UU", ru: "RU", nu: "NU", pu: "PU", zu: "ZU", ubersuu: "Ubers UU",
  nationaldex: "National Dex", nationaldexuu: "National Dex UU", nationaldexubers: "National Dex Ubers",
  letsgoou: "Let's Go OU", lgpeou: "Let's Go OU", lc: "Little Cup", nfe: "NFE",
};

const first = <T,>(x: T | T[] | undefined): T | undefined => (Array.isArray(x) ? x[0] : x);
const pct = (n: number) => `${Math.round(n)}%`;

function listPt(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export async function smartBuild(opts: {
  pokemon: Pokemon;
  learned: LearnedMove[];
  game: Game | null;
  style: BuildStyle;
  level: number;
  teammates: Pokemon[];
}): Promise<SmartBuild> {
  const { pokemon, learned, game, style } = opts;
  const base = buildSuggestedMember({ pokemon, learnset: [...new Set(learned.map((m) => m.name))], game, style });

  let moveData: Record<string, SdMove>;
  try {
    moveData = await getMoveData();
  } catch {
    return { patch: base, source: { kind: "simples" }, reasons: [{ label: "Sem conexão", text: "Não deu pra baixar os dados dos golpes, então usei a sugestão simples." }] };
  }

  if (style === "competitiva") {
    const fromSmogon = await trySmogon(opts, moveData).catch(() => null);
    if (fromSmogon) return fromSmogon;
  }
  return calculated(opts, moveData, base);
}

/* ───────────────────────── Competitiva: set real da Smogon ───────────────────────── */

async function trySmogon(
  opts: Parameters<typeof smartBuild>[0],
  moveData: Record<string, SdMove>,
): Promise<SmartBuild | null> {
  const { pokemon, learned, game } = opts;
  const gen = game?.gen ?? 9;
  const sets = await getSmogonSets(gen);

  // Acha a espécie: nome exato; formas padrão ("mimikyu-disguised") também tentam o nome base.
  const byKey = new Map(Object.keys(sets).map((k) => [toApiName(k), k]));
  let key = byKey.get(pokemon.name) ?? byKey.get(pokemon.name.replace(/-breed$/, ""));
  if (!key && pokemon.id <= 1025) {
    const parts = pokemon.name.split("-");
    while (!key && parts.length > 1) {
      parts.pop();
      key = byKey.get(parts.join("-"));
    }
  }
  if (!key) return null;

  const learnable = learned.length ? await fullLearnable(pokemon, learned, game?.versionGroup ?? null) : new Set<string>();
  const canLearn = (sdName: string) => learnable.size === 0 || learnable.has(toApiName(sdName));
  const order = game?.kind === "hack" ? HACK_SINGLES : SINGLES;

  // Escolhe o formato mais relevante e, dentro dele, o set com mais golpes que existem neste jogo.
  let best: { format: string; name: string; set: SdSet; ok: number } | null = null;
  for (const format of order) {
    const group = sets[key][format];
    if (!group) continue;
    for (const [name, set] of Object.entries(group)) {
      const ok = set.moves.filter((slot) => (Array.isArray(slot) ? slot : [slot]).some(canLearn)).length;
      if (!best || ok > best.ok) best = { format, name, set, ok };
    }
    if (best && best.ok >= 3) break;
  }
  if (!best || best.ok < 3) return null;

  const { set } = best;
  const reasons: BuildReason[] = [];
  const hasTera = !game || game.tera;
  const hasAbilities = gen >= 3;
  const hasItems = gen >= 2;

  // Golpes: em cada vaga, a primeira opção do set que existe neste jogo.
  const moves: string[] = [];
  const missing: string[] = [];
  for (const slot of set.moves) {
    const options = Array.isArray(slot) ? slot : [slot];
    const pick = options.map((o) => (/^hidden power/i.test(o) ? "Hidden Power" : o)).find((o) => canLearn(o) && !moves.includes(toApiName(o)));
    if (pick) moves.push(toApiName(pick));
    else missing.push(options[0]);
  }
  // Vaga sem golpe válido: completa com o melhor ataque calculado.
  if (moves.length < 4) {
    const extra = rankCandidates(opts, moveData, "competitiva").filter((c) => !moves.includes(c.name));
    const used = new Set(moves.map((m) => moveData[sdId(m)]?.type?.toLowerCase()));
    const fill = extra.find((c) => !used.has(c.type)) ?? extra[0];
    if (fill) {
      moves.push(fill.name);
      reasons.push({
        label: displayName(fill.name),
        text: `${listPt(missing)} não existe${missing.length > 1 ? "m" : ""} neste jogo; entrou ${displayName(fill.name)}, o melhor ataque que sobrou.`,
      });
    }
  }

  const evs: Partial<Record<StatKey, number>> = { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 };
  for (const [k, v] of Object.entries(first(set.evs) ?? {})) if (SD_STAT[k]) evs[SD_STAT[k]] = v;
  const ivs: Partial<Record<StatKey, number>> = {};
  for (const [k, v] of Object.entries(first(set.ivs) ?? {})) if (SD_STAT[k]) ivs[SD_STAT[k]] = v;

  const abilityName = first(set.ability);
  const sdAbility = abilityName ? toApiName(abilityName) : null;
  const ability = !hasAbilities ? null : sdAbility && pokemon.abilities.some((a) => a.name === sdAbility) ? sdAbility : (pokemon.abilities[0]?.name ?? null);
  const nature = gen >= 3 ? (first(set.nature) ?? "Hardy").toLowerCase() : "hardy";
  const item = hasItems ? (first(set.item) ?? "") : "";
  const teraRaw = first(set.teratypes);
  const tera = hasTera && teraRaw ? teraRaw.toLowerCase() : null;

  const formatName = FORMAT_LABEL[best.format] ?? best.format.toUpperCase();
  reasons.unshift({
    label: "Origem",
    text: `Set "${best.name}" do ${formatName} da ${gen}ª geração, usado por jogadores competitivos na Smogon. Cada golpe foi conferido no que ${pokemonName(pokemon.name)} aprende neste jogo.`,
  });
  if (item) reasons.push({ label: item, text: "Item do set competitivo." });
  if (Object.keys(ivs).length) reasons.push({ label: "IVs", text: "O set usa IVs específicos (por exemplo 0 de Velocidade para Trick Room ou 0 de Ataque em atacantes especiais)." });

  return {
    patch: { moves: moves.slice(0, 4), evs, ivs, nature, ability, item, tera },
    source: { kind: "smogon", format: formatName, setName: best.name },
    reasons,
  };
}

/* ───────────────────────── Calculada (casual, ou competitiva sem set) ───────────────────────── */

function rankCandidates(opts: Parameters<typeof smartBuild>[0], moveData: Record<string, SdMove>, style: BuildStyle): Candidate[] {
  const { pokemon, learned, game, level } = opts;
  const gen = game?.gen ?? 9;
  const types = typesInGen(pokemon, gen);
  const valid = new Set(typesOfGen(gen));
  const stat = (k: StatKey) => pokemon.stats.find((s) => s.key === k)?.value ?? 50;
  const atk = stat("attack");
  const spa = stat("special-attack");
  const top = Math.max(atk, spa);
  const adaptability = pokemon.abilities.some((a) => a.name === "adaptability");

  // Casual: só o que dá pra ter na campanha agora (nível até o atual, TM e tutor; sem golpes de ovo).
  const sources = new Map<string, string>();
  for (const m of learned) {
    if (style === "casual" && (m.method === "egg" || (m.method === "level" && m.level > level))) continue;
    const label = m.method === "level" ? (m.level <= 1 ? "desde o início" : `Nv ${m.level}`) : m.method === "machine" ? "TM" : m.method === "tutor" ? "tutor" : "ovo";
    const prev = sources.get(m.name);
    if (!prev || (prev.startsWith("Nv") && label === "desde o início")) sources.set(m.name, label);
  }

  const out: Candidate[] = [];
  for (const [name, source] of sources) {
    if (SKIP_MOVES.has(name)) continue;
    const md = moveData[sdId(name)];
    if (!md || md.category === "Status" || md.isZ || md.isMax || md.ohko || md.selfdestruct) continue;
    const type = md.type.toLowerCase() as TypeName;
    if (!valid.has(type)) continue;
    const category: "physical" | "special" = gen <= 3 ? (PHYSICAL_TYPES_OLD.has(type) ? "physical" : "special") : md.category === "Physical" ? "physical" : "special";

    let bp = md.basePower;
    const notes: string[] = [];
    if (md.damage === "level") {
      bp = Math.max(40, Math.min(100, level * 1.1));
      notes.push("dano igual ao nível");
    }
    if (!bp) continue;
    if (Array.isArray(md.multihit)) bp *= 3;
    else if (typeof md.multihit === "number") bp *= md.multihit;

    const acc = md.accuracy === true ? 1 : md.accuracy / 100;
    const stab = types.includes(type) ? (adaptability ? 2 : 1.5) : 1;
    const statFactor = (category === "physical" ? atk : spa) / top;
    let power = bp * acc * (md.damage === "level" ? 1 : stab * statFactor);

    const casual = style === "casual";
    if (stab > 1 && md.damage !== "level") notes.push("mesmo tipo (STAB)");
    if (md.accuracy !== true && md.accuracy < 100) notes.push(`${md.accuracy}% de precisão`);
    if (md.flags.recharge) {
      power *= 0.5;
      notes.push("precisa recarregar");
    }
    if (md.flags.charge && name !== "solar-blade" && name !== "solar-beam") {
      power *= casual ? 0.55 : 0.4;
      notes.push("leva dois turnos");
    } else if (md.flags.charge) {
      power *= casual ? 0.6 : 0.5;
      notes.push("carrega um turno sem sol");
    }
    if (md.recoil) {
      power *= casual ? 0.85 : 0.93;
      notes.push("causa recuo");
    }
    const drops = Object.entries(md.self?.boosts ?? {}).filter(([, v]) => v < 0);
    if (drops.some(([k]) => k === "atk" || k === "spa")) {
      power *= casual ? 0.72 : 0.94;
      notes.push("baixa o próprio ataque");
    } else if (drops.length) {
      power *= casual ? 0.92 : 0.97;
      notes.push("baixa a própria defesa");
    }
    if (md.self?.volatileStatus === "lockedmove") {
      power *= casual ? 0.85 : 0.92;
      notes.push("prende 2–3 turnos e confunde");
    }
    if (casual && md.pp <= 5) power *= 0.88;
    else if (casual && md.pp <= 10) power *= 0.96;
    if (md.drain) {
      power *= casual ? 1.08 : 1.03;
      notes.push("recupera vida");
    }
    if (md.priority > 0) {
      power *= casual ? 0.95 : 1.06;
      notes.push("tem prioridade");
    }
    out.push({ name, type, category, power, notes, source });
  }
  return out.sort((a, b) => b.power - a.power);
}

function calculated(opts: Parameters<typeof smartBuild>[0], moveData: Record<string, SdMove>, base: Partial<Member>): SmartBuild {
  const { pokemon, learned, game, style, teammates, level } = opts;
  const gen = game?.gen ?? 9;
  const types = typesInGen(pokemon, gen);
  const casual = style === "casual";
  const reasons: BuildReason[] = [];
  const candidates = rankCandidates(opts, moveData, style);

  // Alvos: no casual, os tipos dos líderes e da Liga do jogo; senão, todos os tipos.
  const bosses = casual && game ? bossesForGame(game.id) : [];
  const targetMap = new Map<TypeName, Target>();
  if (bosses.length) {
    for (const b of bosses) {
      const w = (b.kind === "elite" ? 1.3 : 1) / b.types.length;
      for (const t of b.types) {
        const cur = targetMap.get(t) ?? { type: t, weight: 0, who: [] };
        cur.weight += w;
        if (!cur.who.includes(b.name)) cur.who.push(b.name);
        targetMap.set(t, cur);
      }
    }
  } else {
    for (const t of typesOfGen(gen)) targetMap.set(t, { type: t, weight: 1, who: [] });
  }

  // Buracos do time: tipos que nenhum colega acerta super efetivo com o próprio tipo valem mais.
  const mates = teammates.filter((p) => p.id !== pokemon.id).map((p) => typesInGen(p, gen));
  const gaps: TypeName[] = [];
  if (mates.length) {
    for (const t of targetMap.values()) {
      const covered = mates.some((mt) => mt.some((a) => multiplier(a, [t.type], gen) > 1));
      if (!covered) {
        t.weight *= 1.5;
        gaps.push(t.type);
      }
    }
  }
  const targets = [...targetMap.values()];

  const value = (set: Candidate[]) =>
    targets.reduce((sum, t) => sum + t.weight * Math.max(0, ...set.map((c) => c.power * multiplier(c.type, [t.type], gen))), 0);

  // Escolha gulosa: a cada vaga, o golpe que mais aumenta o dano total contra os alvos (um por tipo).
  const chosen: Candidate[] = [];
  const gains: number[] = [];
  const bestStab = candidates.find((c) => types.includes(c.type));
  if (bestStab) {
    chosen.push(bestStab);
    gains.push(value(chosen));
  }
  while (chosen.length < 4) {
    const current = value(chosen);
    let bestC: Candidate | null = null;
    let bestGain = 0;
    for (const c of candidates) {
      if (chosen.some((x) => x.name === c.name || x.type === c.type)) continue;
      const g = value([...chosen, c]) - current;
      if (g > bestGain) {
        bestGain = g;
        bestC = c;
      }
    }
    if (!bestC) break;
    chosen.push(bestC);
    gains.push(bestGain);
  }

  const learnable = new Set(
    learned.filter((m) => !casual || (m.method !== "egg" && !(m.method === "level" && m.level > level))).map((m) => m.name),
  );
  const moves = chosen.map((c) => c.name);
  const total = value(chosen) || 1;

  // Golpe de reforço (Swords Dance, Calm Mind…) no lugar do 4º ataque quando ele quase não soma.
  const cat = chosen[0]?.category ?? "physical";
  const setup = SETUP[cat].find((m) => learnable.has(m));
  const lastGain = gains[3] ?? 0;
  if (setup && moves.length === 4 && lastGain / total < (casual ? 0.06 : 0.1)) {
    const dropped = moves.pop()!;
    chosen.pop();
    moves.push(setup);
    reasons.push({
      label: displayName(setup),
      text:
        lastGain / total < 0.01
          ? `${displayName(dropped)} quase não acrescentava dano contra os alvos; aumentar o ataque rende mais.`
          : `${displayName(dropped)} acrescentava só ${pct((lastGain / total) * 100)} de dano contra os alvos; aumentar o ataque rende mais.`,
    });
  }
  // Completa vagas vazias com o que sobrar.
  for (const c of candidates) {
    if (moves.length >= 4) break;
    if (!moves.includes(c.name)) moves.push(c.name);
  }

  // Motivo de cada ataque: quem ele acerta melhor que os outros golpes.
  for (const c of chosen) {
    const beats = targets.filter((t) => {
      const mine = c.power * multiplier(c.type, [t.type], gen);
      return mine > 0 && multiplier(c.type, [t.type], gen) > 1 && chosen.every((o) => o === c || o.power * multiplier(o.type, [t.type], gen) <= mine);
    });
    const parts: string[] = [];
    const isStab = c.notes.includes("mesmo tipo (STAB)");
    const extra = c.notes.filter((n) => n !== "mesmo tipo (STAB)");
    parts.push([isStab ? "mesmo tipo (STAB)" : c.notes.includes("dano igual ao nível") ? "" : `cobertura de ${TYPE_INFO[c.type].pt}`, ...extra].filter(Boolean).join(", "));
    if (beats.length) {
      if (bosses.length) {
        const names = [...new Set(beats.flatMap((t) => t.who))];
        parts.push(`melhor golpe contra ${listPt(names.slice(0, 5))}${names.length > 5 ? " e outros" : ""}`);
      } else {
        parts.push(`super efetivo em ${listPt(beats.map((t) => TYPE_INFO[t.type].pt).slice(0, 5))}`);
      }
    }
    const gapHit = beats.filter((t) => gaps.includes(t.type)).map((t) => TYPE_INFO[t.type].pt);
    if (gapHit.length) parts.push(`ninguém do time cobria ${listPt(gapHit)}`);
    if (casual) parts.push(c.source === "TM" ? "vem de TM" : c.source === "tutor" ? "vem de tutor" : `aprende ${c.source}`);
    reasons.push({ label: displayName(c.name), text: `${parts.join("; ")}.` });
  }

  // Item: no casual, o que fortalece o tipo do golpe que mais causa dano.
  let item = base.item ?? "";
  if (casual && gen >= 2 && chosen[0]) {
    const st = (k: StatKey) => pokemon.stats.find((s) => s.key === k)?.value ?? 50;
    const attack = Math.max(st("attack"), st("special-attack"));
    const tank = st("defense") + st("special-defense") >= (st("attack") + st("special-attack")) * 1.32 && attack < 95;
    if (!tank) {
      item = TYPE_ITEM[chosen[0].type];
      if (chosen[0].type === "fairy" && gen < 9) item = gen >= 6 ? "Pixie Plate" : "Leftovers";
      reasons.push({ label: item, text: `aumenta em 20% o dano de ${displayName(chosen[0].name)}, o golpe mais forte da build, e é fácil de achar na campanha.` });
    } else {
      reasons.push({ label: item || "Leftovers", text: "Pokémon mais defensivo: recuperar vida todo turno vale mais que bater forte." });
    }
  } else if (item && /choice/i.test(item) && moves.some((m) => moveData[sdId(m)]?.category === "Status")) {
    item = "Life Orb";
  }

  const tera = !game || game.tera ? (chosen[0]?.type ?? base.tera ?? null) : null;
  if (tera && chosen[0]) reasons.push({ label: `Tera ${TYPE_INFO[tera as TypeName]?.pt ?? tera}`, text: `reforça ${displayName(chosen[0]?.name ?? "")}.` });

  const intro = casual
    ? bosses.length
      ? `Calculada pro ${game?.label}: dano real de cada golpe que ${pokemonName(pokemon.name)} já pode ter no Nv ${level} (sem golpes de ovo), escolhendo a combinação que mais bate nos ${bosses.length} líderes e na Liga.`
      : `Calculada: dano real de cada golpe que ${pokemonName(pokemon.name)} já pode ter no Nv ${level}, cobrindo o máximo de tipos.`
    : `Não há set da Smogon pra ${pokemonName(pokemon.name)} nesta geração, então a build foi calculada: golpes mais fortes e com melhor cobertura entre os que ele aprende neste jogo.`;
  reasons.unshift({ label: "Como", text: intro });
  if (gaps.length && mates.length) reasons.push({ label: "Time", text: `Tipos que o resto do time não acerta super efetivo: ${listPt(gaps.map((t) => TYPE_INFO[t].pt))}. Eles pesaram mais na escolha.` });

  return {
    patch: { ...base, moves: moves.slice(0, 4), item, tera },
    source: { kind: "calculada" },
    reasons,
  };
}
