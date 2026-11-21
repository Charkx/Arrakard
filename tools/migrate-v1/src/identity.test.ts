import { describe, expect, it } from 'vitest';
import { playerKey } from './identity.ts';

describe('playerKey (clé de joueur de la v1)', () => {
  it.each([
    ['Zéphyr', 'zephyr'],
    ['ARK Zéphyr', 'zephyr'],
    ['MGI Ptit  bébou', 'ptit bebou'],
    ['BARK Autre Nom', 'autre nom'],
    ['KGB', 'kgb'],
    ['  Zéphyr ', 'zephyr'],
    ['ZÉPHYR', 'zephyr'],
  ])('« %s » → « %s »', (name, key) => {
    expect(playerKey(name)).toBe(key);
  });

  it('ne retire qu’un tag de 2 à 4 majuscules suivi d’une espace', () => {
    expect(playerKey('ABCDE Zéphyr')).toBe('abcde zephyr');
    expect(playerKey('A Zéphyr')).toBe('a zephyr');
  });
});
