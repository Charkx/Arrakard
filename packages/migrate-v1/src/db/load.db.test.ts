import { project, rankLeaderboard, V1_RATING_RULES } from '@arrakis/domain';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { planMigration, type MigrationPlan } from '../plan.ts';
import { fingerprint, removeOrganization } from '../testing/db.ts';
import { demoBackupCopy } from '../testing/demo-backup.ts';
import { loadPlan } from './load.ts';
import { toProjectionRows } from './projection-rows.ts';
import { readFacts, readProjectionRows } from './read.ts';
import { LOCAL_DATABASE_URL } from './target.ts';

/**
 * Tests d'écriture, sur la base locale (`supabase db start`). Ils travaillent
 * dans une organisation à eux, supprimée à la fin : ils ne touchent pas aux
 * données qu'un chargement manuel aurait mises dans l'organisation « arrakis ».
 */
const ORGANIZATION = { slug: 'essai-chargement', name: 'Essai de chargement' };

const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
// Une copie : la base locale peut déjà contenir la démonstration d'origine.
const plan = planMigration(demoBackupCopy(1));

const load = (toLoad: MigrationPlan = plan) =>
  loadPlan(sql, toLoad, ORGANIZATION, { replace: true });
const contentOfBase = () => fingerprint(sql, ORGANIZATION.slug);

beforeAll(async () => {
  await removeOrganization(sql, ORGANIZATION.slug);
});

afterAll(async () => {
  await removeOrganization(sql, ORGANIZATION.slug);
  await sql.end();
});

describe('charger une sauvegarde dans la base locale', () => {
  it('un visiteur lit le classement de la saison active, dans l’ordre attendu', async () => {
    const { organizationId } = await load();

    // Ce que le site lira : notes et joueurs, avec les seuls droits d'un visiteur.
    const read = await sql.begin(async (tx) => {
      await tx`set local role anon`;
      return tx<
        {
          player_id: string;
          nickname: string;
          archived: boolean;
          rating: number;
          winrate: number;
          kda: number;
          games: number;
        }[]
      >`
        select r.player_id, p.nickname, p.archived, r.rating, r.winrate, r.kda::float8 as kda, r.games
        from player_season_ratings r
        join seasons s on s.id = r.season_id
        join players p on p.id = r.player_id
        where r.organization_id = ${organizationId} and s.status = 'open'`;
    });
    const nicknames = new Map(read.map((r) => [r.player_id, r.nickname]));
    const podium = rankLeaderboard(
      read.map((r) => ({ ...r, playerId: r.player_id, role: 'MID' as const, divisions: [] })),
    )
      .slice(0, 3)
      .map((row) => `${nicknames.get(row.playerId) ?? '?'} ${row.rank}`);

    // Valeurs fixes : la sauvegarde de démonstration est déterministe.
    expect(podium).toEqual(PODIUM);
  });

  it('refuse d’écraser une organisation qui contient déjà des données, sauf demande explicite', async () => {
    await load();
    const before = await contentOfBase();

    await expect(loadPlan(sql, plan, ORGANIZATION, { replace: false })).rejects.toThrow(
      '--replace',
    );

    expect(await contentOfBase()).toBe(before);
  });

  it('relancée sur la même sauvegarde, elle laisse la base strictement identique', async () => {
    await load();
    const before = await contentOfBase();

    await load();

    expect(await contentOfBase()).toBe(before);
  });

  it('si une étape échoue, la base reste dans l’état d’avant', async () => {
    await load();
    const before = await contentOfBase();
    const [firstPerformance, ...otherPerformances] = plan.rows.performances;
    if (!firstPerformance)
      throw new Error('La sauvegarde de démonstration n’a aucune performance.');
    const brokenPlan: MigrationPlan = {
      ...plan,
      rows: {
        ...plan.rows,
        // Une performance cite un joueur qui n'existe pas : la base la refusera.
        performances: [
          { ...firstPerformance, player_id: '00000000-0000-4000-8000-00000000dead' },
          ...otherPerformances,
        ],
      },
    };

    // 23503 : violation de clé étrangère, levée après l'écriture des premières tables.
    await expect(load(brokenPlan)).rejects.toMatchObject({ code: '23503' });

    expect(await contentOfBase()).toBe(before);
  });

  it('les projections écrites sont exactement celles que le domaine calcule à partir des faits écrits', async () => {
    const { organizationId } = await load();

    const written = await readProjectionRows(sql, organizationId);

    const factsInBase = await readFacts(sql, organizationId);
    const recomputed = toProjectionRows(project(factsInBase, V1_RATING_RULES));
    expect(written.player_season_ratings.length).toBeGreaterThan(0);
    expect(written).toEqual(recomputed);
  });

  it('écrit aussi les inscriptions et les personnalisations de carte, comptes Riot compris', async () => {
    const { organizationId } = await load();

    const [counts] = await sql<{ registrations: number; accounts: string[] }[]>`
      select
        (select count(*)::int from registrations where organization_id = ${organizationId}) as registrations,
        (select array_agg(account ->> 'riotId' order by account ->> 'riotId')
         from card_customizations c, jsonb_array_elements(c.riot_accounts) account
         where c.organization_id = ${organizationId}) as accounts`;

    expect(counts).toEqual({ registrations: 2, accounts: ['Gouvernail#MER', 'Sextant#MER'] });
  });
});

/** Les trois premiers de la démonstration, saison active, avec leur rang. */
const PODIUM = ['Lanterne 1', 'Hauban 2', 'Misaine 3'];
