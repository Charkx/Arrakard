import { stableUuid } from './identity.ts';
import type { MigrationPlan } from './plan.ts';

/** L'organisation que lit le site public : elle garde les identifiants de la v1. */
export const PRODUCTION_SLUG = 'arrakis';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Une colonne qui porte un identifiant de ligne : `id`, `merged_into`, ou un
 * `…_id` dont la valeur est un UUID. `discord_user_id` et `alt_riot_id` n'en
 * sont pas : ce ne sont pas des UUID, et ils gardent leur valeur.
 */
const isIdColumn = (column: string, value: string) =>
  (column === 'id' || column === 'merged_into' || column.endsWith('_id')) && UUID.test(value);

/**
 * Le plan à charger dans cette organisation. Un identifiant n'existe qu'une
 * fois dans la base : hors de la production, chaque identifiant du plan est
 * remplacé par un UUID stable, tiré du slug et de l'identifiant d'origine. Les
 * liens entre lignes tiennent, et deux chargements dans la même organisation
 * donnent la même base (ADR 0021). Les autres colonnes, adresses comprises,
 * ne changent pas.
 */
export function planForOrganization(plan: MigrationPlan, slug: string): MigrationPlan {
  if (slug === PRODUCTION_SLUG) return plan;
  const rekey = (id: string) => stableUuid(`${slug}|${id.toLowerCase()}`);
  const rekeyValues = (map: ReadonlyMap<string, string>) =>
    new Map([...map].map(([key, id]) => [key, rekey(id)]));
  return {
    ...plan,
    rows: JSON.parse(JSON.stringify(plan.rows), (column: string, value: unknown) =>
      typeof value === 'string' && isIdColumn(column, value) ? rekey(value) : value,
    ) as MigrationPlan['rows'],
    playerIdByKey: rekeyValues(plan.playerIdByKey),
    seasonIdBySplitId: rekeyValues(plan.seasonIdBySplitId),
  };
}
