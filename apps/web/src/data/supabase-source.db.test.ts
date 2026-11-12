import { project, rankLeaderboard, V1_RATING_RULES } from '@arrakis/domain';
import { planMigration } from '@arrakis/migrate-v1/src/plan.ts';
import { demoBackup } from '@arrakis/migrate-v1/src/testing/demo-backup.ts';
import { toFacts } from '@arrakis/migrate-v1/src/verify.ts';
import { describe, expect, it } from 'vitest';
import type { PlayerPageData } from './player.ts';
import { supabaseSource } from './supabase-source.ts';

/** Le profil chargé, ou une erreur claire s'il manque. */
function asPage(loaded: unknown): PlayerPageData {
  if (loaded === null || typeof loaded !== 'object' || !('profile' in loaded)) {
    throw new Error('Profil introuvable dans la base locale.');
  }
  return loaded as PlayerPageData;
}

/**
 * Test sur l'API locale (`pnpm db:start`), après le chargement de la
 * sauvegarde de démonstration dans l'organisation « arrakis » :
 *
 *   pnpm --filter @arrakis/migrate-v1 load demo-backup --replace
 *
 * Il lit le classement exactement comme le site, avec les droits d'un visiteur.
 */
const { rows } = planMigration(demoBackup());
const activeSeason = rows.seasons.find((s) => s.status === 'open');
/** Les notes de la saison en cours, calculées par le domaine à partir de la sauvegarde. */
const domainRatings = new Map(
  project(toFacts(rows), V1_RATING_RULES)
    .seasonRatings.filter((r) => r.seasonId === activeSeason?.id)
    .map((r) => [r.playerId, r.rating.rating]),
);

describe('lire le classement dans la base locale', () => {
  it('donne la saison en cours, et pour chaque joueur la note que calcule le domaine', async () => {
    const { seasonName, entries } = await supabaseSource().loadLeaderboard();

    expect(seasonName).toBe(activeSeason?.name);
    expect(new Map(entries.map((e) => [e.playerId, e.rating]))).toEqual(domainRatings);
  });

  it('range les joueurs dans l’ordre attendu, sans le joueur archivé', async () => {
    const { entries } = await supabaseSource().loadLeaderboard();
    const nickname = (id: string) => entries.find((e) => e.playerId === id)?.nickname;

    const ranked = rankLeaderboard(entries).map((row) => nickname(row.playerId));

    // Valeurs fixes : la sauvegarde de démonstration est déterministe.
    expect(ranked.slice(0, 3)).toEqual(['Lanterne', 'Hauban', 'Misaine']);
    expect(entries.some((e) => e.nickname === 'Épave' && e.archived)).toBe(true);
    expect(ranked).not.toContain('Épave');
  });

  it('donne à chaque joueur son équipe actuelle et ses éditions jouées', async () => {
    const { entries } = await supabaseSource().loadLeaderboard();

    expect(entries.find((e) => e.nickname === 'Lanterne')).toMatchObject({
      teamTag: 'PHA',
      divisions: ['div1'],
      editionsPlayed: 2,
    });
  });
});

describe('lire le profil d’un joueur dans la base locale', () => {
  it('donne sa note de saison, la même que le classement, et ses trois champions', async () => {
    const source = supabaseSource();
    const { entries } = await source.loadLeaderboard();
    const lanterne = entries.find((e) => e.nickname === 'Lanterne');

    const page = asPage(await source.loadPlayer(lanterne?.playerId ?? ''));

    // Les trois champions les plus joués de la saison, comptés dans la sauvegarde.
    const seasonMatches = new Set(
      rows.matches
        .filter(
          (m) => rows.editions.find((e) => e.id === m.edition_id)?.season_id === activeSeason?.id,
        )
        .map((m) => m.id),
    );
    const counts = new Map<string, number>();
    for (const p of rows.performances) {
      if (p.player_id === lanterne?.playerId && seasonMatches.has(p.match_id)) {
        counts.set(p.champion, (counts.get(p.champion) ?? 0) + 1);
      }
    }
    const topThree = [...counts]
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .slice(0, 3)
      .map(([name]) => name);
    expect(page.profile.teamTag).toBe(lanterne?.teamTag);
    expect(page.profile.season).toMatchObject({
      role: lanterne?.role,
      rating: lanterne?.rating,
      impact: lanterne?.impact,
      consistency: lanterne?.consistency,
      clutch: lanterne?.clutch,
      tier: lanterne?.tier,
      games: lanterne?.games,
      topChampions: topThree,
    });
  });

  it('donne tous ses matchs, toutes saisons comprises', async () => {
    const lanterneId = rows.players.find((p) => p.nickname === 'Lanterne')?.id ?? '';
    const played = rows.performances.filter((p) => p.player_id === lanterneId);

    const page = asPage(await supabaseSource().loadPlayer(lanterneId));

    const seasonsPlayed = new Set(
      played.map(
        (p) =>
          rows.editions.find(
            (e) => e.id === rows.matches.find((m) => m.id === p.match_id)?.edition_id,
          )?.season_id,
      ),
    );
    expect(seasonsPlayed.size).toBeGreaterThan(1);
    expect(page.matches).toHaveLength(played.length);
  });

  it('ne trouve aucun joueur derrière un identifiant inconnu', async () => {
    const source = supabaseSource();

    expect(await source.loadPlayer('00000000-0000-4000-8000-000000000000')).toBeNull();
    expect(await source.loadPlayer('pas-un-identifiant')).toBeNull();
  });
});
