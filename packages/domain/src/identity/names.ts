/** Forme canonique d'une graphie de pseudo : minuscules, sans accents, espaces simples. */
export function normalizeAlias(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sépare « TAG Pseudo ». Le préfixe n'est retiré que s'il s'agit d'une équipe
 * connue : « KGB Fan » reste un pseudo si KGB n'est pas une équipe (anomalie A7).
 */
export function splitTeamTag(
  fullName: string,
  knownTags: ReadonlySet<string>,
): { teamTag: string | null; nickname: string } {
  const trimmed = fullName.replace(/\s+/g, ' ').trim();
  const space = trimmed.indexOf(' ');
  const prefix = trimmed.slice(0, space);
  if (space > 0 && knownTags.has(prefix)) {
    return { teamTag: prefix, nickname: trimmed.slice(space + 1) };
  }
  return { teamTag: null, nickname: trimmed };
}

/** Similarité de 0 à 1 entre deux graphies : 1 − distance d'édition / longueur max. */
export function similarity(a: string, b: string): number {
  const x = normalizeAlias(a);
  const y = normalizeAlias(b);
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 1;
  return 1 - editDistance(x, y) / longest;
}

/** Distance de Levenshtein, sur deux lignes de la matrice. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
