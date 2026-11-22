import { createHash } from 'node:crypto';
import type { MigrationPlan } from './plan.ts';

/** L'organisation du site public : elle garde les identifiants de la v1. */
export const PRODUCTION_SLUG = 'arrakis';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Un UUID (version 4, variante RFC) tiré d'une empreinte hexadécimale. */
export function uuidFromHex(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Le plan à charger dans cette organisation. Un identifiant n'existe qu'une
 * fois dans la base : hors de la production, chaque UUID du plan est remplacé
 * par un UUID tiré de lui et du slug. Les liens entre lignes tiennent, et deux
 * chargements dans la même organisation donnent la même base (ADR 0021).
 */
export function planForOrganization(plan: MigrationPlan, slug: string): MigrationPlan {
  if (slug === PRODUCTION_SLUG) return plan;
  const rekey = (id: string) =>
    uuidFromHex(createHash('sha256').update(`${slug}|${id.toLowerCase()}`).digest('hex'));
  return {
    ...plan,
    rows: JSON.parse(JSON.stringify(plan.rows).replace(UUID, rekey)) as MigrationPlan['rows'],
  };
}
