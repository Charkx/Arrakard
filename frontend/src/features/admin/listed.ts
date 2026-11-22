/**
 * Le choix d'une liste déroulante, s'il y est encore ; sinon sa première
 * option. Après un rechargement, une équipe archivée ou un profil fusionné
 * disparaît de la liste : on n'envoie que ce qui est affiché.
 */
export function listedOr(chosen: string, options: readonly string[]): string {
  return options.includes(chosen) ? chosen : (options[0] ?? '');
}
