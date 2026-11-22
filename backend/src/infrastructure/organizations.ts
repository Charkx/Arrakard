import type { OrganizationRepository } from '../application/index.ts';
import { E1_E2_RATING_RULES, V1_RATING_RULES, type RatingRules } from '../domain/index.ts';
import type { TransactionSql } from 'postgres';
import type { Db } from './tables.ts';

/** Règles de note de chaque organisation, par leur nom dans `organizations.rating_rules` (ADR 0008). */
export const RATING_RULES: Readonly<Record<string, RatingRules>> = {
  v1: V1_RATING_RULES,
  e1_e2: E1_E2_RATING_RULES,
};

/** Crée l'organisation, ou renomme celle qui porte déjà ce slug, et rend son identifiant. */
export async function upsertOrganization(
  tx: TransactionSql,
  { slug, name }: { readonly slug: string; readonly name: string },
): Promise<string> {
  const [organization] = await tx<{ id: string }[]>`
    insert into organizations (slug, name) values (${slug}, ${name})
    on conflict (slug) do update set name = excluded.name
    returning id`;
  if (!organization) throw new Error(`Organisation ${slug} : création impossible.`);
  return organization.id;
}

export function postgresOrganizations(db: Db): OrganizationRepository {
  return {
    async ratingRules(organizationId) {
      const [organization] = await db<{ rating_rules: string }[]>`
        select rating_rules from organizations where id = ${organizationId}`;
      const rules = organization && RATING_RULES[organization.rating_rules];
      if (!rules) {
        throw new Error(`Organisation ${organizationId} introuvable, ou règles de note inconnues.`);
      }
      return rules;
    },
  };
}
