/** Deux lettres pour l'avatar : les initiales de deux mots, sinon les deux premières lettres. */
export function initialsOf(nickname: string): string {
  const words = nickname.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters =
    words.length >= 2 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : nickname.slice(0, 2);
  return letters.toUpperCase();
}
