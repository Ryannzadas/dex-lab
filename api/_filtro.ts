/**
 * Filtro simples de palavrões (português e inglês) para o que aparece na vitrine e no perfil público.
 * Normaliza acentos e troca de letras por números ("m3rd4" → "merda") antes de comparar.
 */

// Palavras que só contam sozinhas (senão pegariam palavras inocentes: "cuidado", "pirocinese"...).
const WHOLE = ["cu", "rola", "anus", "ass", "fag", "cock", "dick", "cum", "tit", "tits", "rape", "kys", "porra", "puta", "puto", "viado", "piroca", "buceta", "xota", "bosta"];
// Palavras que contam mesmo dentro de outras ("filhodaputa", "caralhooo").
const ANYWHERE = [
  "caralh", "merda", "daputa", "filhodaput", "foder", "fodase", "fodido", "arrombad", "desgracad", "vagabund", "putaria", "cuzao", "otario",
  "boquete", "punheta", "siririca", "pinto duro", "retardad", "macaco imundo", "nazista", "hitler",
  "fuck", "shit", "bitch", "cunt", "nigg", "fagg", "whore", "slut", "retard", "porn", "pussy",
];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/(.)\1{2,}/g, "$1$1");
}

export function isOffensive(...texts: (string | null | undefined)[]) {
  return texts.some((raw) => {
    if (!raw) return false;
    const text = normalize(raw);
    const squashed = text.replace(/[^a-z]/g, "");
    const words = new Set(text.split(/[^a-z]+/).filter(Boolean));
    return ANYWHERE.some((w) => squashed.includes(w.replace(/ /g, ""))) || WHOLE.some((w) => words.has(w));
  });
}
