import { rankLeaderboard } from '@arrakis/domain';
import { describe, expect, it } from 'vitest';
import { supabaseSource } from './supabase-source.ts';

/**
 * Test sur l'API locale (`supabase start`), après le chargement de la
 * sauvegarde de démonstration dans l'organisation « arrakis » :
 *
 *   pnpm --filter @arrakis/migrate-v1 load demo-backup --replace
 *
 * Il lit le classement exactement comme le site, avec les droits d'un visiteur.
 */
describe('lire le classement dans la base locale', () => {
  it('donne la saison en cours et ses joueurs, que le domaine range dans l’ordre attendu', async () => {
    const { seasonName, entries } = await supabaseSource().loadLeaderboard();

    const podium = rankLeaderboard(entries)
      .slice(0, 3)
      .map((row) => entries.find((e) => e.playerId === row.playerId)?.nickname);
    expect(seasonName).toBe('Saison 3');
    expect(podium).toEqual(['Lanterne', 'Hauban', 'Misaine']);
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
