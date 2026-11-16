import { effectiveness, multiplier, type TypeName } from "./types";
import type { Pokemon } from "./pokeapi";

export type Boss = {
  id: string;
  name: string;
  role: string;
  kind: "gym" | "elite";
  types: TypeName[];
  levelCap: number;
  /** Pokémon assinatura do líder/chefe (para exibir o ícone). */
  ace: number;
};

const KANTO_BOSSES: Boss[] = [
  { id: "brock", name: "Brock", role: "1º Ginásio", kind: "gym", types: ["rock", "ground"], levelCap: 14, ace: 95 },
  { id: "misty", name: "Misty", role: "2º Ginásio", kind: "gym", types: ["water"], levelCap: 21, ace: 121 },
  { id: "surge", name: "Lt. Surge", role: "3º Ginásio", kind: "gym", types: ["electric"], levelCap: 24, ace: 26 },
  { id: "erika", name: "Erika", role: "4º Ginásio", kind: "gym", types: ["grass", "poison"], levelCap: 29, ace: 45 },
  { id: "koga", name: "Koga", role: "5º Ginásio", kind: "gym", types: ["poison"], levelCap: 43, ace: 110 },
  { id: "sabrina", name: "Sabrina", role: "6º Ginásio", kind: "gym", types: ["psychic"], levelCap: 43, ace: 65 },
  { id: "blaine", name: "Blaine", role: "7º Ginásio", kind: "gym", types: ["fire"], levelCap: 47, ace: 59 },
  { id: "giovanni", name: "Giovanni", role: "8º Ginásio", kind: "gym", types: ["ground", "rock"], levelCap: 50, ace: 112 },
  { id: "lorelei", name: "Lorelei", role: "Elite 4", kind: "elite", types: ["ice", "water"], levelCap: 54, ace: 131 },
  { id: "bruno", name: "Bruno", role: "Elite 4", kind: "elite", types: ["fighting", "rock"], levelCap: 56, ace: 68 },
  { id: "agatha", name: "Agatha", role: "Elite 4", kind: "elite", types: ["ghost", "poison"], levelCap: 58, ace: 94 },
  { id: "lance", name: "Lance", role: "Elite 4", kind: "elite", types: ["dragon", "flying"], levelCap: 60, ace: 149 },
  { id: "blue", name: "Blue", role: "Campeão", kind: "elite", types: ["flying", "water", "fire"], levelCap: 63, ace: 6 },
];

const RADICAL_RED_BOSSES: Boss[] = [
  { id: "rr-brock", name: "Brock", role: "1º Ginásio", kind: "gym", types: ["rock", "ground"], levelCap: 15, ace: 95 },
  { id: "rr-misty", name: "Misty", role: "2º Ginásio", kind: "gym", types: ["water"], levelCap: 27, ace: 121 },
  { id: "rr-surge", name: "Lt. Surge", role: "3º Ginásio", kind: "gym", types: ["electric"], levelCap: 34, ace: 310 },
  { id: "rr-erika", name: "Erika", role: "4º Ginásio", kind: "gym", types: ["grass"], levelCap: 44, ace: 3 },
  { id: "rr-sabrina", name: "Sabrina", role: "5º Ginásio", kind: "gym", types: ["psychic", "fairy"], levelCap: 59, ace: 858 },
  { id: "rr-koga", name: "Koga", role: "6º Ginásio", kind: "gym", types: ["poison", "dark"], levelCap: 68, ace: 849 },
  { id: "rr-blaine", name: "Blaine", role: "7º Ginásio", kind: "gym", types: ["fire"], levelCap: 76, ace: 6 },
  { id: "rr-clair", name: "Clair", role: "8º Ginásio", kind: "gym", types: ["dragon"], levelCap: 81, ace: 884 },
  { id: "rr-lorelei", name: "Lorelei", role: "Elite 4", kind: "elite", types: ["ice", "water"], levelCap: 85, ace: 382 },
  { id: "rr-bruno", name: "Bruno", role: "Elite 4", kind: "elite", types: ["fighting", "steel"], levelCap: 85, ace: 888 },
  { id: "rr-agatha", name: "Agatha", role: "Elite 4", kind: "elite", types: ["ghost", "dark"], levelCap: 85, ace: 802 },
  { id: "rr-lance", name: "Lance", role: "Elite 4", kind: "elite", types: ["dragon", "steel"], levelCap: 85, ace: 483 },
  { id: "rr-blue", name: "Blue", role: "Campeão", kind: "elite", types: ["flying", "fire", "dark"], levelCap: 85, ace: 717 },
];

const JOHTO_BOSSES: Boss[] = [
  { id: "falkner", name: "Falkner", role: "1º Ginásio", kind: "gym", types: ["flying"], levelCap: 13, ace: 17 },
  { id: "bugsy", name: "Bugsy", role: "2º Ginásio", kind: "gym", types: ["bug"], levelCap: 17, ace: 123 },
  { id: "whitney", name: "Whitney", role: "3º Ginásio", kind: "gym", types: ["normal"], levelCap: 19, ace: 241 },
  { id: "morty", name: "Morty", role: "4º Ginásio", kind: "gym", types: ["ghost", "poison"], levelCap: 25, ace: 94 },
  { id: "chuck", name: "Chuck", role: "5º Ginásio", kind: "gym", types: ["fighting"], levelCap: 31, ace: 62 },
  { id: "jasmine", name: "Jasmine", role: "6º Ginásio", kind: "gym", types: ["steel"], levelCap: 35, ace: 208 },
  { id: "pryce", name: "Pryce", role: "7º Ginásio", kind: "gym", types: ["ice"], levelCap: 34, ace: 221 },
  { id: "clair", name: "Clair", role: "8º Ginásio", kind: "gym", types: ["dragon", "water"], levelCap: 41, ace: 230 },
  { id: "will", name: "Will", role: "Elite 4", kind: "elite", types: ["psychic"], levelCap: 42, ace: 178 },
  { id: "koga-j", name: "Koga", role: "Elite 4", kind: "elite", types: ["poison", "bug"], levelCap: 44, ace: 169 },
  { id: "bruno-j", name: "Bruno", role: "Elite 4", kind: "elite", types: ["fighting", "rock"], levelCap: 46, ace: 68 },
  { id: "karen", name: "Karen", role: "Elite 4", kind: "elite", types: ["dark", "ghost"], levelCap: 47, ace: 229 },
  { id: "lance-j", name: "Lance", role: "Campeão", kind: "elite", types: ["dragon", "flying"], levelCap: 50, ace: 149 },
];

const HOENN_BOSSES: Boss[] = [
  { id: "roxanne", name: "Roxanne", role: "1º Ginásio", kind: "gym", types: ["rock"], levelCap: 15, ace: 299 },
  { id: "brawly", name: "Brawly", role: "2º Ginásio", kind: "gym", types: ["fighting"], levelCap: 19, ace: 297 },
  { id: "wattson", name: "Wattson", role: "3º Ginásio", kind: "gym", types: ["electric", "steel"], levelCap: 24, ace: 310 },
  { id: "flannery", name: "Flannery", role: "4º Ginásio", kind: "gym", types: ["fire"], levelCap: 29, ace: 324 },
  { id: "norman", name: "Norman", role: "5º Ginásio", kind: "gym", types: ["normal"], levelCap: 31, ace: 289 },
  { id: "winona", name: "Winona", role: "6º Ginásio", kind: "gym", types: ["flying"], levelCap: 33, ace: 334 },
  { id: "tate-liza", name: "Tate & Liza", role: "7º Ginásio", kind: "gym", types: ["psychic", "rock"], levelCap: 42, ace: 338 },
  { id: "wallace", name: "Wallace / Juan", role: "8º Ginásio", kind: "gym", types: ["water"], levelCap: 46, ace: 350 },
  { id: "sidney", name: "Sidney", role: "Elite 4", kind: "elite", types: ["dark"], levelCap: 49, ace: 359 },
  { id: "phoebe", name: "Phoebe", role: "Elite 4", kind: "elite", types: ["ghost"], levelCap: 51, ace: 356 },
  { id: "glacia", name: "Glacia", role: "Elite 4", kind: "elite", types: ["ice", "water"], levelCap: 53, ace: 365 },
  { id: "drake", name: "Drake", role: "Elite 4", kind: "elite", types: ["dragon", "flying"], levelCap: 55, ace: 373 },
  { id: "steven", name: "Steven / Wallace", role: "Campeão", kind: "elite", types: ["steel", "rock", "water"], levelCap: 58, ace: 376 },
];

const SINNOH_BOSSES: Boss[] = [
  { id: "roark", name: "Roark", role: "1º Ginásio", kind: "gym", types: ["rock"], levelCap: 14, ace: 408 },
  { id: "gardenia", name: "Gardenia", role: "2º Ginásio", kind: "gym", types: ["grass"], levelCap: 22, ace: 407 },
  { id: "fantina", name: "Fantina", role: "3º Ginásio", kind: "gym", types: ["ghost"], levelCap: 26, ace: 429 },
  { id: "maylene", name: "Maylene", role: "4º Ginásio", kind: "gym", types: ["fighting"], levelCap: 32, ace: 448 },
  { id: "wake", name: "Crasher Wake", role: "5º Ginásio", kind: "gym", types: ["water"], levelCap: 37, ace: 419 },
  { id: "byron", name: "Byron", role: "6º Ginásio", kind: "gym", types: ["steel", "rock"], levelCap: 41, ace: 411 },
  { id: "candice", name: "Candice", role: "7º Ginásio", kind: "gym", types: ["ice"], levelCap: 44, ace: 478 },
  { id: "volkner", name: "Volkner", role: "8º Ginásio", kind: "gym", types: ["electric"], levelCap: 50, ace: 466 },
  { id: "aaron", name: "Aaron", role: "Elite 4", kind: "elite", types: ["bug", "poison"], levelCap: 53, ace: 452 },
  { id: "bertha", name: "Bertha", role: "Elite 4", kind: "elite", types: ["ground", "rock"], levelCap: 55, ace: 450 },
  { id: "flint", name: "Flint", role: "Elite 4", kind: "elite", types: ["fire"], levelCap: 57, ace: 392 },
  { id: "lucian", name: "Lucian", role: "Elite 4", kind: "elite", types: ["psychic"], levelCap: 59, ace: 475 },
  { id: "cynthia", name: "Cynthia", role: "Campeã", kind: "elite", types: ["dragon", "ground", "ghost"], levelCap: 62, ace: 445 },
];

const HISUI_BOSSES: Boss[] = [
  { id: "kleavor", name: "Kleavor (Noble)", role: "1º Nobre", kind: "gym", types: ["bug", "rock"], levelCap: 18, ace: 900 },
  { id: "lilligant", name: "Lilligant (Noble)", role: "2º Nobre", kind: "gym", types: ["grass", "fighting"], levelCap: 30, ace: 549 },
  { id: "arcanine", name: "Arcanine (Noble)", role: "3º Nobre", kind: "gym", types: ["fire", "rock"], levelCap: 40, ace: 59 },
  { id: "electrode", name: "Electrode (Noble)", role: "4º Nobre", kind: "gym", types: ["electric", "grass"], levelCap: 46, ace: 101 },
  { id: "avalugg", name: "Avalugg (Noble)", role: "5º Nobre", kind: "gym", types: ["ice", "rock"], levelCap: 56, ace: 713 },
  { id: "volo", name: "Volo & Giratina", role: "Chefe Final", kind: "elite", types: ["ghost", "dragon", "fairy"], levelCap: 68, ace: 487 },
];

const UNOVA_BOSSES: Boss[] = [
  { id: "trio", name: "Trio / Cheren", role: "1º Ginásio", kind: "gym", types: ["normal", "grass", "fire"], levelCap: 14, ace: 507 },
  { id: "lenora", name: "Lenora / Roxie", role: "2º Ginásio", kind: "gym", types: ["normal", "poison"], levelCap: 20, ace: 545 },
  { id: "burgh", name: "Burgh", role: "3º Ginásio", kind: "gym", types: ["bug", "grass"], levelCap: 24, ace: 542 },
  { id: "elesa", name: "Elesa", role: "4º Ginásio", kind: "gym", types: ["electric", "flying"], levelCap: 28, ace: 523 },
  { id: "clay", name: "Clay", role: "5º Ginásio", kind: "gym", types: ["ground", "steel"], levelCap: 33, ace: 530 },
  { id: "skyla", name: "Skyla", role: "6º Ginásio", kind: "gym", types: ["flying"], levelCap: 37, ace: 581 },
  { id: "brycen", name: "Brycen / Drayden", role: "7º Ginásio", kind: "gym", types: ["ice", "dragon"], levelCap: 43, ace: 612 },
  { id: "iris-gym", name: "Drayden / Marlon", role: "8º Ginásio", kind: "gym", types: ["dragon", "water"], levelCap: 48, ace: 593 },
  { id: "shauntal", name: "Shauntal", role: "Elite 4", kind: "elite", types: ["ghost", "fire"], levelCap: 52, ace: 609 },
  { id: "grimsley", name: "Grimsley", role: "Elite 4", kind: "elite", types: ["dark", "steel"], levelCap: 52, ace: 625 },
  { id: "caitlin", name: "Caitlin", role: "Elite 4", kind: "elite", types: ["psychic"], levelCap: 52, ace: 579 },
  { id: "marshal", name: "Marshal", role: "Elite 4", kind: "elite", types: ["fighting"], levelCap: 52, ace: 534 },
  { id: "iris", name: "Alder / Iris", role: "Campeão", kind: "elite", types: ["dragon", "bug", "fire"], levelCap: 59, ace: 637 },
];

const KALOS_BOSSES: Boss[] = [
  { id: "viola", name: "Viola", role: "1º Ginásio", kind: "gym", types: ["bug", "flying"], levelCap: 12, ace: 666 },
  { id: "grant", name: "Grant", role: "2º Ginásio", kind: "gym", types: ["rock", "ice"], levelCap: 25, ace: 697 },
  { id: "korrina", name: "Korrina", role: "3º Ginásio", kind: "gym", types: ["fighting", "flying"], levelCap: 32, ace: 701 },
  { id: "ramos", name: "Ramos", role: "4º Ginásio", kind: "gym", types: ["grass"], levelCap: 34, ace: 673 },
  { id: "clemont", name: "Clemont", role: "5º Ginásio", kind: "gym", types: ["electric", "normal"], levelCap: 37, ace: 695 },
  { id: "valerie", name: "Valerie", role: "6º Ginásio", kind: "gym", types: ["fairy"], levelCap: 42, ace: 700 },
  { id: "olympia", name: "Olympia", role: "7º Ginásio", kind: "gym", types: ["psychic"], levelCap: 48, ace: 678 },
  { id: "wulfric", name: "Wulfric", role: "8º Ginásio", kind: "gym", types: ["ice"], levelCap: 59, ace: 713 },
  { id: "malva", name: "Malva", role: "Elite 4", kind: "elite", types: ["fire", "flying"], levelCap: 65, ace: 663 },
  { id: "siebold", name: "Siebold", role: "Elite 4", kind: "elite", types: ["water"], levelCap: 65, ace: 689 },
  { id: "wikstrom", name: "Wikstrom", role: "Elite 4", kind: "elite", types: ["steel"], levelCap: 65, ace: 681 },
  { id: "drasna", name: "Drasna", role: "Elite 4", kind: "elite", types: ["dragon", "flying"], levelCap: 65, ace: 715 },
  { id: "diantha", name: "Diantha", role: "Campeã", kind: "elite", types: ["fairy", "psychic", "dragon"], levelCap: 68, ace: 282 },
];

const ALOLA_BOSSES: Boss[] = [
  { id: "hala", name: "Kahuna Hala", role: "Grande Prova 1", kind: "gym", types: ["fighting"], levelCap: 16, ace: 740 },
  { id: "lana", name: "Prova de Água", role: "Ilha Akala", kind: "gym", types: ["water", "bug"], levelCap: 20, ace: 752 },
  { id: "kiawe", name: "Prova de Fogo", role: "Ilha Akala", kind: "gym", types: ["fire", "poison"], levelCap: 22, ace: 758 },
  { id: "mallow", name: "Prova de Planta", role: "Ilha Akala", kind: "gym", types: ["grass"], levelCap: 24, ace: 754 },
  { id: "olivia", name: "Kahuna Olivia", role: "Grande Prova 2", kind: "gym", types: ["rock"], levelCap: 28, ace: 745 },
  { id: "sophocles", name: "Prova Elétrica", role: "Ilha Ula'ula", kind: "gym", types: ["electric", "bug"], levelCap: 33, ace: 738 },
  { id: "acerola", name: "Prova Fantasma", role: "Ilha Ula'ula", kind: "gym", types: ["ghost", "fairy"], levelCap: 35, ace: 778 },
  { id: "nanu", name: "Kahuna Nanu", role: "Grande Prova 3", kind: "gym", types: ["dark"], levelCap: 44, ace: 53 },
  { id: "hapu", name: "Kahuna Hapu", role: "Grande Prova 4", kind: "gym", types: ["ground"], levelCap: 53, ace: 750 },
  { id: "molayne", name: "Hala / Molayne", role: "Elite 4", kind: "elite", types: ["steel", "fighting"], levelCap: 57, ace: 462 },
  { id: "olivia-e4", name: "Olivia", role: "Elite 4", kind: "elite", types: ["rock"], levelCap: 57, ace: 745 },
  { id: "acerola-e4", name: "Acerola", role: "Elite 4", kind: "elite", types: ["ghost"], levelCap: 57, ace: 770 },
  { id: "kahili", name: "Kahili", role: "Elite 4", kind: "elite", types: ["flying"], levelCap: 57, ace: 733 },
  { id: "kukui", name: "Prof. Kukui / Hau", role: "Campeão", kind: "elite", types: ["fire", "water", "grass"], levelCap: 60, ace: 727 },
];

const GALAR_BOSSES: Boss[] = [
  { id: "milo", name: "Milo", role: "1º Ginásio", kind: "gym", types: ["grass"], levelCap: 20, ace: 830 },
  { id: "nessa", name: "Nessa", role: "2º Ginásio", kind: "gym", types: ["water", "rock"], levelCap: 24, ace: 834 },
  { id: "kabu", name: "Kabu", role: "3º Ginásio", kind: "gym", types: ["fire", "bug"], levelCap: 27, ace: 851 },
  { id: "bea", name: "Bea / Allister", role: "4º Ginásio", kind: "gym", types: ["fighting", "ghost"], levelCap: 36, ace: 68 },
  { id: "opal", name: "Opal", role: "5º Ginásio", kind: "gym", types: ["fairy"], levelCap: 38, ace: 869 },
  { id: "gordie", name: "Gordie / Melony", role: "6º Ginásio", kind: "gym", types: ["rock", "ice"], levelCap: 42, ace: 839 },
  { id: "piers", name: "Piers", role: "7º Ginásio", kind: "gym", types: ["dark", "normal"], levelCap: 46, ace: 862 },
  { id: "raihan", name: "Raihan", role: "8º Ginásio", kind: "gym", types: ["dragon", "steel"], levelCap: 48, ace: 884 },
  { id: "leon", name: "Leon", role: "Campeão", kind: "elite", types: ["fire", "dragon", "ghost"], levelCap: 65, ace: 6 },
];

const PALDEA_BOSSES: Boss[] = [
  { id: "katy", name: "Katy", role: "1º Ginásio", kind: "gym", types: ["bug"], levelCap: 15, ace: 217 },
  { id: "brassius", name: "Brassius", role: "2º Ginásio", kind: "gym", types: ["grass"], levelCap: 17, ace: 185 },
  { id: "iono", name: "Iono", role: "3º Ginásio", kind: "gym", types: ["electric"], levelCap: 24, ace: 429 },
  { id: "kofu", name: "Kofu", role: "4º Ginásio", kind: "gym", types: ["water"], levelCap: 30, ace: 740 },
  { id: "larry", name: "Larry", role: "5º Ginásio", kind: "gym", types: ["normal", "flying"], levelCap: 36, ace: 398 },
  { id: "ryme", name: "Ryme", role: "6º Ginásio", kind: "gym", types: ["ghost"], levelCap: 42, ace: 972 },
  { id: "tulip", name: "Tulip", role: "7º Ginásio", kind: "gym", types: ["psychic"], levelCap: 45, ace: 956 },
  { id: "grusha", name: "Grusha", role: "8º Ginásio", kind: "gym", types: ["ice"], levelCap: 48, ace: 334 },
  { id: "rika", name: "Rika", role: "Elite 4", kind: "elite", types: ["ground"], levelCap: 57, ace: 980 },
  { id: "poppy", name: "Poppy", role: "Elite 4", kind: "elite", types: ["steel"], levelCap: 58, ace: 959 },
  { id: "larry-e4", name: "Larry (E4)", role: "Elite 4", kind: "elite", types: ["flying"], levelCap: 59, ace: 973 },
  { id: "hassel", name: "Hassel", role: "Elite 4", kind: "elite", types: ["dragon"], levelCap: 60, ace: 998 },
  { id: "geeta", name: "Geeta", role: "Campeã", kind: "elite", types: ["rock", "poison", "steel"], levelCap: 62, ace: 970 },
];

const UNBOUND_BOSSES: Boss[] = [
  { id: "mirskle", name: "Mirskle", role: "1º Ginásio", kind: "gym", types: ["grass"], levelCap: 20, ace: 586 },
  { id: "vega", name: "Véga", role: "2º Ginásio", kind: "gym", types: ["dark"], levelCap: 26, ace: 461 },
  { id: "alice", name: "Alice", role: "3º Ginásio", kind: "gym", types: ["flying"], levelCap: 32, ace: 472 },
  { id: "mel", name: "Mel (Inverso)", role: "4º Ginásio", kind: "gym", types: ["normal"], levelCap: 36, ace: 474 },
  { id: "maxima", name: "Maxima", role: "5º Ginásio", kind: "gym", types: ["steel", "fairy"], levelCap: 40, ace: 376 },
  { id: "galavan", name: "Galavan", role: "6º Ginásio", kind: "gym", types: ["electric", "steel"], levelCap: 45, ace: 462 },
  { id: "big-mo", name: "Big Mo", role: "7º Ginásio", kind: "gym", types: ["fighting"], levelCap: 52, ace: 534 },
  { id: "tessy", name: "Tessy", role: "8º Ginásio", kind: "gym", types: ["water", "dragon"], levelCap: 57, ace: 230 },
  { id: "moleman", name: "Moleman", role: "Elite 4", kind: "elite", types: ["ground"], levelCap: 75, ace: 530 },
  { id: "elias", name: "Elias", role: "Elite 4", kind: "elite", types: ["ghost"], levelCap: 75, ace: 609 },
  { id: "arabella", name: "Arabella", role: "Elite 4", kind: "elite", types: ["fairy"], levelCap: 75, ace: 700 },
  { id: "penny", name: "Penny", role: "Elite 4", kind: "elite", types: ["dragon"], levelCap: 75, ace: 445 },
];

/** Devolve os líderes de ginásio e a Elite 4 do jogo escolhido. */
export function bossesForGame(gameId: string | null): Boss[] {
  switch (gameId) {
    case "radical-red":
      return RADICAL_RED_BOSSES;
    case "unbound":
      return UNBOUND_BOSSES;
    case "gold-silver":
    case "crystal":
    case "heartgold-soulsilver":
      return JOHTO_BOSSES;
    case "ruby-sapphire":
    case "emerald":
    case "omega-ruby-alpha-sapphire":
    case "quetzal":
      return HOENN_BOSSES;
    case "diamond-pearl":
    case "platinum":
    case "brilliant-diamond-shining-pearl":
      return SINNOH_BOSSES;
    case "legends-arceus":
      return HISUI_BOSSES;
    case "black-white":
    case "black-2-white-2":
      return UNOVA_BOSSES;
    case "x-y":
    case "legends-za":
      return KALOS_BOSSES;
    case "sun-moon":
    case "ultra-sun-ultra-moon":
      return ALOLA_BOSSES;
    case "sword-shield":
      return GALAR_BOSSES;
    case "scarlet-violet":
      return PALDEA_BOSSES;
    case "red-blue":
    case "yellow":
    case "firered-leafgreen":
    case "lets-go":
    default:
      return KANTO_BOSSES;
  }
}

export type BossEval = {
  boss: Boss;
  /** Membros que acertam super efetivo e não apanham super efetivo do líder. */
  strong: Pokemon[];
  /** Membros que tomam dano super efetivo do tipo do líder. */
  weak: Pokemon[];
  verdict: "tranquilo" | "atencao" | "perigo";
};

/**
 * Avalia o time contra um líder de ginásio ou membro da Elite 4:
 * - Usa os golpes de dano escolhidos (ou os tipos de STAB do membro se ainda estiver sem golpes);
 * - Verifica quem bate super efetivo nos tipos do chefe e quem sofre fraqueza contra ele.
 */
export function evaluateBoss({
  boss,
  team,
  memberTypes,
  memberAttackTypes,
  gen,
}: {
  boss: Boss;
  team: Pokemon[];
  memberTypes: Record<number, TypeName[]>;
  memberAttackTypes: Record<number, TypeName[]>;
  gen: number;
}): BossEval {
  const strong: Pokemon[] = [];
  const weak: Pokemon[] = [];

  for (const p of team) {
    const defTypes = memberTypes[p.id] ?? p.types;
    const atkTypes = memberAttackTypes[p.id]?.length ? memberAttackTypes[p.id] : defTypes;

    const takesSuper = boss.types.some((bt) => multiplier(bt, defTypes, gen) > 1);
    const hitsSuper = boss.types.some((bt) => atkTypes.some((at) => effectiveness(at, bt, gen) > 1));

    if (takesSuper) weak.push(p);
    if (hitsSuper && !takesSuper) strong.push(p);
  }

  let verdict: BossEval["verdict"] = "atencao";
  if (strong.length >= 2 || (strong.length === 1 && weak.length <= 1)) {
    verdict = "tranquilo";
  } else if (strong.length === 0 && weak.length >= Math.ceil(team.length / 2)) {
    verdict = "perigo";
  } else if (strong.length === 0) {
    verdict = "perigo";
  }

  return { boss, strong, weak, verdict };
}
