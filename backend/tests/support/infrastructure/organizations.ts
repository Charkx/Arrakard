import type { FactRows } from '#application/index.ts';
import { RATING_RULES } from '#infrastructure/organizations.ts';
import { clearOrganization, type Db } from '#infrastructure/tables.ts';
import { writeFacts } from '#infrastructure/write.ts';
import type { RatingRules } from '#domain/index.ts';
import type { Sql } from 'postgres';

/** Supprime l'organisation de ce slug, ses faits, ses projections et son journal. */
export async function removeOrganization(sql: Sql, slug: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [organization] = await tx<{ id: string }[]>`
      select id from organizations where slug = ${slug}`;
    if (!organization) return;
    await clearOrganization(tx, organization.id);
    await tx`delete from organizations where id = ${organization.id}`;
  });
}

/**
 * Crée une organisation d'essai avec ces règles et ces faits, et rend son
 * identifiant. Ajoute les colonnes obligatoires que les faits de jeu ne portent pas.
 */
export async function createOrganization(
  sql: Sql,
  slug: string,
  rules: RatingRules,
  rows: FactRows,
): Promise<string> {
  const ruleName = Object.keys(RATING_RULES).find((name) => RATING_RULES[name] === rules);
  return sql.begin(async (tx) => {
    const [organization] = await tx<{ id: string }[]>`
      insert into organizations (slug, name, rating_rules)
      values (${slug}, ${`Essai ${slug}`}, ${ruleName ?? 'inconnues'})
      returning id`;
    if (!organization) throw new Error(`Organisation ${slug} : création impossible.`);
    await writeFacts(tx, organization.id, {
      seasons: rows.seasons.map((s) => ({ ...s, name: 'Saison d’essai', year: 2026 })),
      teams: [],
      players: rows.players.map((p) => ({ ...p, merged_into: null })),
      player_aliases: [],
      team_memberships: [],
      editions: rows.editions.map((e, i) => ({ ...e, name: `Édition d’essai ${i + 1}` })),
      matches: rows.matches,
      performances: rows.performances,
      edition_participants: [],
      card_customizations: [],
      registrations: [],
    });
    return organization.id;
  });
}

/** Crée un utilisateur de connexion (`auth.users`) et rend son identifiant. */
export async function createUser(db: Db, email: string): Promise<string> {
  const [user] = await db<{ id: string }[]>`
    insert into auth.users (id, email) values (gen_random_uuid(), ${email}) returning id`;
  if (!user) throw new Error(`Utilisateur ${email} : création impossible.`);
  return user.id;
}

/** Supprime les utilisateurs dont l'adresse finit par ce domaine. */
export async function removeUsers(db: Db, domain: string): Promise<void> {
  await db`delete from auth.users where email like ${`%@${domain}`}`;
}
