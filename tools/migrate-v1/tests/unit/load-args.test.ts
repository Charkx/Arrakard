import { describe, expect, it } from 'vitest';
import { parseLoadArgs } from '#src/load-args.ts';

describe('parseLoadArgs', () => {
  it('sans option, charge l’organisation du site public, sans rien remplacer', () => {
    expect(parseLoadArgs(['sauvegarde'])).toEqual({
      dir: 'sauvegarde',
      organization: { slug: 'arrakis', name: 'Arrakis' },
      replace: false,
      confirmHosted: false,
    });
  });

  it('vise l’organisation d’essai avec --organization=arrakis-essai', () => {
    expect(
      parseLoadArgs([
        'sauvegarde',
        '--organization=arrakis-essai',
        '--replace',
        '--confirm-hosted',
      ]),
    ).toEqual({
      dir: 'sauvegarde',
      organization: { slug: 'arrakis-essai', name: 'Arrakis (essai)' },
      replace: true,
      confirmHosted: true,
    });
  });

  it.each([
    ['sans dossier', []],
    ['une organisation inconnue', ['sauvegarde', '--organization=pirate']],
    ['l’organisation sans « = »', ['sauvegarde', '--organization', 'arrakis-essai']],
  ])('refuse %s', (_case, args) => {
    expect(parseLoadArgs(args)).toBeUndefined();
  });
});
