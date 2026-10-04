import { describe, expect, it } from 'vitest';
import { aMatchPerformance, anEventMatch } from '../testing/builders';
import { computeEventStandings, OFFICIAL_SCORING } from './event-standings';

const nicknames: Record<string, string> = { ahri: 'Ahri', bard: 'Bard', zed: 'Zed' };
const nicknameOf = (playerId: string) => nicknames[playerId] ?? playerId;

describe('computeEventStandings', () => {
  it('une édition sans match donne un classement vide', () => {
    expect(computeEventStandings({ matches: [] }, nicknameOf)).toEqual([]);
  });

  it('applique le barème officiel : V +5, D −3, kill +3, assist +2, mort −3', () => {
    const event = {
      matches: [
        anEventMatch([
          aMatchPerformance({ playerId: 'ahri', result: 'win', kills: 3, deaths: 1, assists: 2 }),
        ]),
      ],
    };

    const [row] = computeEventStandings(event, nicknameOf);

    expect(row).toMatchObject({
      playerId: 'ahri',
      rank: 1,
      resultPoints: 5,
      statPoints: 9 - 3 + 4,
      mvpPoints: 0,
      points: 15,
    });
  });

  it('cumule les matchs de la soirée', () => {
    const event = {
      matches: [
        anEventMatch([aMatchPerformance({ playerId: 'ahri', result: 'win', kills: 2 })]),
        anEventMatch([
          aMatchPerformance({ playerId: 'ahri', result: 'loss', deaths: 4, assists: 1 }),
        ]),
      ],
    };

    const [row] = computeEventStandings(event, nicknameOf);

    expect(row).toMatchObject({
      games: 2,
      wins: 1,
      losses: 1,
      kills: 2,
      deaths: 4,
      assists: 1,
      points: 5 - 3 + 6 - 12 + 2,
    });
  });

  it('le MVP de soirée gagne le bonus une seule fois ; le MVP de match vaut 0 au barème officiel', () => {
    const event = {
      eventMvpPlayerId: 'ahri',
      matches: [
        anEventMatch([aMatchPerformance({ playerId: 'ahri' })], { mvpPlayerId: 'ahri' }),
        anEventMatch([aMatchPerformance({ playerId: 'ahri' })], { mvpPlayerId: 'ahri' }),
      ],
    };

    const [row] = computeEventStandings(event, nicknameOf);

    expect(row).toMatchObject({ isEventMvp: true, matchMvpCount: 2, mvpPoints: 10 });
  });

  it('utilise le barème propre à l’édition quand il existe', () => {
    const event = {
      scoring: { ...OFFICIAL_SCORING, win: 10, mvpMatch: 4 },
      matches: [
        anEventMatch([aMatchPerformance({ playerId: 'ahri', result: 'win' })], {
          mvpPlayerId: 'ahri',
        }),
      ],
    };

    const [row] = computeEventStandings(event, nicknameOf);

    expect(row).toMatchObject({ resultPoints: 10, mvpPoints: 4, points: 14 });
  });

  it('trie par points, puis par kills, puis par pseudo', () => {
    const event = {
      matches: [
        anEventMatch([
          aMatchPerformance({ playerId: 'zed', result: 'win' }),
          aMatchPerformance({ playerId: 'ahri', result: 'win' }),
          aMatchPerformance({ playerId: 'bard', result: 'loss', kills: 3 }),
        ]),
      ],
    };

    const rows = computeEventStandings(event, nicknameOf);

    // ahri et zed : 5 pts, 0 kill → pseudo ; bard : −3 + 9 = 6 pts.
    expect(rows.map((r) => [r.playerId, r.rank])).toEqual([
      ['bard', 1],
      ['ahri', 2],
      ['zed', 3],
    ]);
  });

  it('retient le rôle et le champion les plus joués, et la dernière équipe vue', () => {
    const event = {
      matches: [
        anEventMatch([
          aMatchPerformance({ playerId: 'ahri', role: 'MID', champion: 'Ahri', team: 'Demacia' }),
        ]),
        anEventMatch([
          aMatchPerformance({ playerId: 'ahri', role: 'SUP', champion: 'Lux', team: 'Demacia' }),
        ]),
        anEventMatch([
          aMatchPerformance({ playerId: 'ahri', role: 'SUP', champion: 'Ahri', team: 'Noxus' }),
        ]),
      ],
    };

    const [row] = computeEventStandings(event, nicknameOf);

    expect(row).toMatchObject({ role: 'SUP', champion: 'Ahri', team: 'Noxus' });
  });
});
