import { describe, expect, it } from 'vitest';
import { aLeaderboardPlayer } from '../testing/builders';
import { rankLeaderboard } from './leaderboard';

const ids = (rows: readonly { playerId: string }[]) => rows.map((r) => r.playerId);

describe('rankLeaderboard', () => {
  it('sans joueur, le classement est vide', () => {
    expect(rankLeaderboard([])).toEqual([]);
  });

  it('trie par note décroissante et numérote les rangs à partir de 1', () => {
    const players = [
      aLeaderboardPlayer({ playerId: 'b', rating: 70 }),
      aLeaderboardPlayer({ playerId: 'a', rating: 85 }),
    ];

    const rows = rankLeaderboard(players);

    expect(rows.map((r) => [r.playerId, r.rank])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('départage à note égale : winrate, puis KDA, puis parties, puis pseudo', () => {
    const players = [
      aLeaderboardPlayer({
        playerId: 'pseudo-z',
        nickname: 'Zed',
        rating: 80,
        winrate: 50,
        kda: 3,
        games: 10,
      }),
      aLeaderboardPlayer({
        playerId: 'pseudo-a',
        nickname: 'Ahri',
        rating: 80,
        winrate: 50,
        kda: 3,
        games: 10,
      }),
      aLeaderboardPlayer({ playerId: 'games', rating: 80, winrate: 50, kda: 3, games: 12 }),
      aLeaderboardPlayer({ playerId: 'kda', rating: 80, winrate: 50, kda: 4, games: 5 }),
      aLeaderboardPlayer({ playerId: 'winrate', rating: 80, winrate: 60, kda: 1, games: 5 }),
    ];

    const rows = rankLeaderboard(players);

    expect(ids(rows)).toEqual(['winrate', 'kda', 'games', 'pseudo-a', 'pseudo-z']);
  });

  it('le départage alphabétique suit le français (accents et casse ignorés)', () => {
    const players = [
      aLeaderboardPlayer({ playerId: 'z', nickname: 'zoé', rating: 70 }),
      aLeaderboardPlayer({ playerId: 'e', nickname: 'Élise', rating: 70 }),
      aLeaderboardPlayer({ playerId: 'a', nickname: 'alex', rating: 70 }),
    ];

    expect(ids(rankLeaderboard(players))).toEqual(['a', 'e', 'z']);
  });

  it.each([
    ['kda', ['kda', 'rating', 'winrate']],
    ['winrate', ['winrate', 'rating', 'kda']],
    ['games', ['games', 'rating', 'kda']],
  ] as const)('tri par %s : ce critère d’abord, puis la cascade habituelle', (sort, expected) => {
    const players = [
      aLeaderboardPlayer({ playerId: 'rating', rating: 90, winrate: 50, kda: 3, games: 10 }),
      aLeaderboardPlayer({ playerId: 'winrate', rating: 70, winrate: 80, kda: 2, games: 8 }),
      aLeaderboardPlayer({ playerId: 'kda', rating: 70, winrate: 40, kda: 6, games: 9 }),
      aLeaderboardPlayer({ playerId: 'games', rating: 60, winrate: 30, kda: 1, games: 40 }),
    ];

    const rows = rankLeaderboard(players, { sort });

    expect(ids(rows).slice(0, 3)).toEqual(expected);
  });

  it('deux joueurs strictement identiques gardent l’ordre fourni', () => {
    const twins = [
      aLeaderboardPlayer({ playerId: 'first' }),
      aLeaderboardPlayer({ playerId: 'second' }),
    ];

    expect(ids(rankLeaderboard(twins))).toEqual(['first', 'second']);
  });

  describe('qui figure au classement', () => {
    it('un joueur doit avoir au moins 5 parties', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'four', games: 4 }),
        aLeaderboardPlayer({ playerId: 'five', games: 5 }),
      ];

      expect(ids(rankLeaderboard(players))).toEqual(['five']);
    });

    it('les joueurs archivés sont exclus', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'archived', archived: true }),
        aLeaderboardPlayer({ playerId: 'active' }),
      ];

      expect(ids(rankLeaderboard(players))).toEqual(['active']);
    });

    it('le filtre de rôle ne garde que ce rôle, et les rangs repartent de 1', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'top', role: 'TOP', rating: 90 }),
        aLeaderboardPlayer({ playerId: 'mid', role: 'MID', rating: 80 }),
      ];

      const rows = rankLeaderboard(players, { role: 'MID' });

      expect(rows).toMatchObject([{ playerId: 'mid', rank: 1 }]);
    });

    it('le filtre de division garde les joueurs dont l’équipe joue dans cette division', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'd1', divisions: ['div1'] }),
        aLeaderboardPlayer({ playerId: 'both', divisions: ['div1', 'div2'] }),
        aLeaderboardPlayer({ playerId: 'free-agent', divisions: [] }),
      ];

      expect(ids(rankLeaderboard(players, { division: 'div2' }))).toEqual(['both']);
    });
  });

  describe('rang précédent : position selon la note avant la dernière édition du split', () => {
    it('reclasse les joueurs selon leur note précédente', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'riser', rating: 85, previousRating: 70 }),
        aLeaderboardPlayer({ playerId: 'faller', rating: 80, previousRating: 82 }),
      ];

      const rows = rankLeaderboard(players);

      expect(rows).toEqual([
        { playerId: 'riser', rank: 1, previousRank: 2 },
        { playerId: 'faller', rank: 2, previousRank: 1 },
      ]);
    });

    it('un joueur sans note précédente est nouveau et ne compte pas dans l’ancien classement', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'newcomer', rating: 90 }),
        aLeaderboardPlayer({ playerId: 'regular', rating: 80, previousRating: 75 }),
      ];

      const rows = rankLeaderboard(players);

      expect(rows.map((r) => r.previousRank)).toEqual([null, 1]);
    });

    it('à note précédente égale, le pseudo départage', () => {
      const players = [
        aLeaderboardPlayer({ playerId: 'b', nickname: 'Bard', rating: 80, previousRating: 70 }),
        aLeaderboardPlayer({ playerId: 'a', nickname: 'Annie', rating: 75, previousRating: 70 }),
      ];

      const rows = rankLeaderboard(players);

      expect(rows.map((r) => [r.playerId, r.previousRank])).toEqual([
        ['b', 2],
        ['a', 1],
      ]);
    });

    it('n’a pas de sens pour les autres tris', () => {
      const players = [aLeaderboardPlayer({ previousRating: 70 })];

      const rows = rankLeaderboard(players, { sort: 'kda' });

      expect(rows[0]?.previousRank).toBeNull();
    });
  });
});
