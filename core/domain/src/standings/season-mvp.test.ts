import { describe, expect, it } from 'vitest';
import { rankSeasonMvps } from './season-mvp.ts';

const nicknameOf = (playerId: string) => playerId;

describe('rankSeasonMvps', () => {
  it('sans titre décerné, le classement est vide', () => {
    expect(rankSeasonMvps([{ matchMvpPlayerIds: ['ahri'] }], nicknameOf)).toEqual([]);
  });

  it('compte les titres de MVP de soirée par joueur', () => {
    const events = [
      { eventMvpPlayerId: 'ahri', matchMvpPlayerIds: [] },
      { eventMvpPlayerId: 'bard', matchMvpPlayerIds: [] },
      { eventMvpPlayerId: 'ahri', matchMvpPlayerIds: [] },
    ];

    expect(rankSeasonMvps(events, nicknameOf)).toEqual([
      { rank: 1, playerId: 'ahri', titles: 2, matchMvps: 0 },
      { rank: 2, playerId: 'bard', titles: 1, matchMvps: 0 },
    ]);
  });

  it('à titres égaux, les MVP de match départagent, puis le pseudo', () => {
    const events = [
      { eventMvpPlayerId: 'zed', matchMvpPlayerIds: ['zed'] },
      { eventMvpPlayerId: 'bard', matchMvpPlayerIds: [] },
      { eventMvpPlayerId: 'ahri', matchMvpPlayerIds: [] },
    ];

    const rows = rankSeasonMvps(events, nicknameOf);

    expect(rows.map((r) => r.playerId)).toEqual(['zed', 'ahri', 'bard']);
  });

  it('les MVP de match d’un joueur sans titre ne le font pas entrer au classement', () => {
    const events = [{ eventMvpPlayerId: 'ahri', matchMvpPlayerIds: ['bard', 'bard'] }];

    expect(rankSeasonMvps(events, nicknameOf).map((r) => r.playerId)).toEqual(['ahri']);
  });
});
