import { project, V1_RATING_RULES } from '@arrakis/domain';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { planMigration, type MigrationPlan } from '../plan.ts';
import { demoBackup } from '../testing/demo-backup.ts';
import { toFacts } from '../verify.ts';
import { loadPlan, removeOrganization } from './load.ts';
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
const plan = planMigration(demoBackup());

/** Empreinte de tout ce que la base contient pour l'organisation de test. */
async function fingerprint(): Promise<string> {
  const [row] = await sql<{ print: string }[]>`
    select md5(string_agg(line, '|' order by line)) as print from (
      select 'seasons' || s::text as line from seasons s join organizations o on o.id = s.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'teams' || t::text from teams t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'players' || t::text from players t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'aliases' || t::text from player_aliases t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'memberships' || t::text from team_memberships t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'editions' || t::text from editions t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'matches' || t::text from matches t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'performances' || t::text from performances t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'participants' || t::text from edition_participants t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'ratings' || t::text from player_season_ratings t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'history' || t::text from player_edition_history t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
      union all select 'standings' || t::text from edition_standings t join organizations o on o.id = t.organization_id where o.slug = ${ORGANIZATION.slug}
    ) lines`;
  return row?.print ?? '';
}

beforeAll(async () => {
  await removeOrganization(sql, ORGANIZATION.slug);
});

afterAll(async () => {
  await removeOrganization(sql, ORGANIZATION.slug);
  await sql.end();
});

describe('charger une sauvegarde dans la base locale', () => {
  it('un visiteur retrouve les notes de la saison active calculées par le domaine', async () => {
    const { organizationId } = await loadPlan(sql, plan, ORGANIZATION);

    const publicRatings = await sql.begin(async (tx) => {
      await tx`set local role anon`;
      return tx<{ player_id: string; rating: number }[]>`
        select r.player_id, r.rating
        from player_season_ratings r
        join seasons s on s.id = r.season_id
        where r.organization_id = ${organizationId} and s.status = 'open'
        order by r.player_id`;
    });

    const activeSeason = plan.rows.seasons.find((s) => s.status === 'open');
    const expected = project(toFacts(plan.rows), V1_RATING_RULES)
      .seasonRatings.filter((r) => r.seasonId === activeSeason?.id)
      .map((r) => ({ player_id: r.playerId, rating: r.rating.rating }))
      .sort((a, b) => a.player_id.localeCompare(b.player_id));
    expect(expected.length).toBeGreaterThan(0);
    expect([...publicRatings]).toEqual(expected);
  });

  it('relancée sur la même sauvegarde, elle laisse la base strictement identique', async () => {
    await loadPlan(sql, plan, ORGANIZATION);
    const before = await fingerprint();

    await loadPlan(sql, plan, ORGANIZATION);

    expect(await fingerprint()).toBe(before);
  });

  it('si une étape échoue, la base reste dans l’état d’avant', async () => {
    await loadPlan(sql, plan, ORGANIZATION);
    const before = await fingerprint();
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
    await expect(loadPlan(sql, brokenPlan, ORGANIZATION)).rejects.toMatchObject({ code: '23503' });

    expect(await fingerprint()).toBe(before);
  });

  it('les projections écrites sont exactement celles que le domaine calcule à partir des faits écrits', async () => {
    const { organizationId } = await loadPlan(sql, plan, ORGANIZATION);

    const written = await readProjectionRows(sql, organizationId);

    const factsInBase = await readFacts(sql, organizationId);
    const recomputed = toProjectionRows(project(factsInBase, V1_RATING_RULES));
    expect(written.player_season_ratings.length).toBeGreaterThan(0);
    expect(written).toEqual(recomputed);
  });
});
