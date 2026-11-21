import { describe, expect, it } from 'vitest';
import { resolvePlayer, type DirectoryPlayer } from './resolve.ts';

const player = (overrides: Partial<DirectoryPlayer> & { playerId: string }): DirectoryPlayer => ({
  aliases: [],
  teamTag: null,
  archived: false,
  ...overrides,
});

describe('resolvePlayer', () => {
  it('reconnaît un joueur par l’un de ses alias, quelle que soit la graphie', () => {
    const directory = [player({ playerId: 'meta', aliases: ['meta', 'ark meta'] })];

    expect(resolvePlayer('MÉTA', { teamTag: null }, directory)).toEqual({
      kind: 'matched',
      playerId: 'meta',
    });
  });

  it('un pseudo jamais vu est inconnu, avec les joueurs à la graphie proche en suggestion', () => {
    const directory = [
      player({ playerId: 'metal', aliases: ['metal'] }),
      player({ playerId: 'meteor', aliases: ['meteor'] }),
      player({ playerId: 'zed', aliases: ['zed'] }),
    ];

    const result = resolvePlayer('Metall', { teamTag: null }, directory);

    expect(result).toEqual({
      kind: 'unknown',
      suggestions: [{ playerId: 'metal', similarity: expect.closeTo(0.833, 3) as number }],
    });
  });

  describe('homonymes : plusieurs joueurs partagent cet alias', () => {
    it('le tag d’équipe de la ligne départage', () => {
      const directory = [
        player({ playerId: 'ark-meta', aliases: ['meta'], teamTag: 'ARK' }),
        player({ playerId: 'blb-meta', aliases: ['meta'], teamTag: 'BLB' }),
      ];

      expect(resolvePlayer('Meta', { teamTag: 'BLB' }, directory)).toEqual({
        kind: 'matched',
        playerId: 'blb-meta',
      });
    });

    it('à défaut, le seul joueur actif l’emporte sur les archivés', () => {
      const directory = [
        player({ playerId: 'old', aliases: ['meta'], archived: true }),
        player({ playerId: 'current', aliases: ['meta'] }),
      ];

      expect(resolvePlayer('Meta', { teamTag: null }, directory)).toEqual({
        kind: 'matched',
        playerId: 'current',
      });
    });

    it('dans la même équipe, le joueur actif l’emporte', () => {
      const directory = [
        player({ playerId: 'old', aliases: ['meta'], teamTag: 'ARK', archived: true }),
        player({ playerId: 'current', aliases: ['meta'], teamTag: 'ARK' }),
        player({ playerId: 'other', aliases: ['meta'], teamTag: 'BLB' }),
      ];

      expect(resolvePlayer('Meta', { teamTag: 'ARK' }, directory)).toEqual({
        kind: 'matched',
        playerId: 'current',
      });
    });

    it('sinon, l’ambiguïté est remontée telle quelle : l’admin tranche', () => {
      const directory = [
        player({ playerId: 'a', aliases: ['meta'], teamTag: 'ARK' }),
        player({ playerId: 'b', aliases: ['meta'], teamTag: 'BLB' }),
      ];

      expect(resolvePlayer('Meta', { teamTag: null }, directory)).toEqual({
        kind: 'ambiguous',
        candidates: ['a', 'b'],
      });
    });
  });
});
