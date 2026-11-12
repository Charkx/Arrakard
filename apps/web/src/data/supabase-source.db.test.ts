import { project, rankLeaderboard, V1_RATING_RULES } from '@arrakis/domain';
import { planMigration } from '@arrakis/migrate-v1/src/plan.ts';
import { demoBackup } from '@arrakis/migrate-v1/src/testing/demo-backup.ts';
import { toFacts } from '@arrakis/migrate-v1/src/verify.ts';
import { describe, expect, it } from 'vitest';
import { supabaseSource } from './supabase-source.ts';

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
