/**
 * Clé de joueur de la v1 (`normalizedPlayerName`) : tag d'équipe en tête
 * retiré, puis minuscules, sans accents, espaces réduites.
 *
 * Copie exacte de l'algorithme v1, et non `normalizeAlias` du domaine : leurs
 * règles d'accents diffèrent sur quelques caractères (`^`, `` ` ``), et la
 * migration doit regrouper les performances exactement comme la v1.
 */
export function playerKey(name: string): string {
  const trimmed = name.trim();
  const shortName = /^[A-Z]{2,4}\s+(.+)$/.exec(trimmed)?.[1]?.trim() ?? trimmed;
  return shortName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
