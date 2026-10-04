import { describe, expect, it } from 'vitest';
import { normalizeAlias, similarity, splitTeamTag } from './names';

describe('normalizeAlias', () => {
  it('ignore la casse, les accents et les espaces superflus', () => {
    expect(normalizeAlias('  Ptit   Bébou ')).toBe('ptit bebou');
  });
});

describe('splitTeamTag', () => {
  const knownTags = new Set(['ARK', 'BARK']);

  it('retire le tag d’une équipe connue', () => {
    expect(splitTeamTag('ARK Meta', knownTags)).toEqual({ teamTag: 'ARK', nickname: 'Meta' });
  });

  it('garde un préfixe en majuscules qui n’est pas une équipe connue (anomalie A7)', () => {
    expect(splitTeamTag('KGB Fan', knownTags)).toEqual({ teamTag: null, nickname: 'KGB Fan' });
  });

  it('un pseudo sans tag reste tel quel, espaces superflus retirés', () => {
    expect(splitTeamTag('  Ptit bébou ', knownTags)).toEqual({
      teamTag: null,
      nickname: 'Ptit bébou',
    });
  });

  it('un pseudo égal à un tag n’est pas vidé', () => {
    expect(splitTeamTag('ARK', knownTags)).toEqual({ teamTag: null, nickname: 'ARK' });
  });

  it('reconnaît les tags de 4 lettres', () => {
    expect(splitTeamTag('BARK Another Name', knownTags)).toEqual({
      teamTag: 'BARK',
      nickname: 'Another Name',
    });
  });
});

describe('similarity', () => {
  it('vaut 1 pour deux graphies équivalentes', () => {
    expect(similarity('Méta', 'meta')).toBe(1);
  });

  it('vaut 1 − distance d’édition / longueur max', () => {
    expect(similarity('Meta', 'Metta')).toBeCloseTo(0.8);
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('deux chaînes vides sont identiques', () => {
    expect(similarity('', '  ')).toBe(1);
  });
});
