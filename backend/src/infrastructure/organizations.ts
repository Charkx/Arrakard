import type { DiscordConfig, OrganizationRepository } from '../application/index.ts';
import { E1_E2_RATING_RULES, V1_RATING_RULES, type RatingRules } from '../domain/index.ts';
import type { TransactionSql } from 'postgres';
import type { Db } from './tables.ts';

/** Règles de note de chaque organisation, par leur nom dans `organizations.rating_rules` (ADR 0008). */
export const RATING_RULES: Readonly<Record<string, RatingRules>> = {
  v1: V1_RATING_RULES,
  e1_e2: E1_E2_RATING_RULES,
};

/** Ce qu'un outil sait d'une organisation avant de la créer (ADR 0008). */
export interface OrganizationSettings {
  readonly slug: string;
  readonly name: string;
  readonly discord?: DiscordConfig;
}

/**
 * Crée l'organisation, ou renomme celle qui porte déjà ce slug, et rend son
 * identifiant. Un serveur Discord déjà configuré est gardé.
 */
export async function upsertOrganization(
  tx: TransactionSql,
  { slug, name, discord }: OrganizationSettings,
): Promise<string> {
  const guildId = discord?.guildId ?? null;
  const adminRoleId = discord?.adminRoleId ?? null;
  const [organization] = await tx<{ id: string }[]>`
    insert into organizations (slug, name, discord_guild_id, discord_admin_role_id)
    values (${slug}, ${name}, ${guildId}, ${adminRoleId})
    on conflict (slug) do update set
      name = excluded.name,
      discord_guild_id = coalesce(organizations.discord_guild_id, excluded.discord_guild_id),
      discord_admin_role_id =
        coalesce(organizations.discord_admin_role_id, excluded.discord_admin_role_id)
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
    async discordConfig(organizationId) {
      const [organization] = await db<
        { discord_guild_id: string | null; discord_admin_role_id: string | null }[]
      >`
        select discord_guild_id, discord_admin_role_id from organizations where id = ${organizationId}`;
      if (!organization?.discord_guild_id || !organization.discord_admin_role_id) return undefined;
      return {
        guildId: organization.discord_guild_id,
        adminRoleId: organization.discord_admin_role_id,
      };
    },
  };
}
