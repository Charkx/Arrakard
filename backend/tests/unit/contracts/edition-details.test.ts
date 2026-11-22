import { describe, expect, it } from 'vitest';
import {
  archiveEditionRequest,
  createEditionRequest,
  updateEditionRequest,
} from '#contracts/edition-details.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';

const IH = {
  organizationId: ORGANIZATION,
  name: ' IH #10 ',
  type: 'inhouse',
  date: '2026-11-27',
  seasonId: ID,
  prestige: 'normal',
  location: '  ',
  url: null,
  description: null,
  arrakisWon: null,
  participantIds: [],
};

describe('createEditionRequest', () => {
  it('accepte une édition ; retire les espaces et rend null un texte vide', () => {
    expect(createEditionRequest.parse(IH)).toMatchObject({ name: 'IH #10', location: null });
  });

  it.each([
    ['un nom vide', { name: ' ' }],
    ['une date qui n’en est pas une', { date: '27/11/2026' }],
    ['un type inconnu', { type: 'scrim' }],
    ['une adresse qui n’est pas un lien web', { url: 'javascript:alert(1)' }],
    ['un participant en double', { participantIds: [ID, ID] }],
  ])('refuse %s', (_case, change) => {
    expect(createEditionRequest.safeParse({ ...IH, ...change }).success).toBe(false);
  });
});

describe('updateEditionRequest', () => {
  it('demande l’édition et sa version', () => {
    expect(updateEditionRequest.safeParse(IH).success).toBe(false);
    expect(updateEditionRequest.safeParse({ ...IH, editionId: ID, version: 3 }).success).toBe(true);
  });
});

describe('archiveEditionRequest', () => {
  it('refuse une version nulle', () => {
    expect(
      archiveEditionRequest.safeParse({ organizationId: ORGANIZATION, editionId: ID, version: 0 })
        .success,
    ).toBe(false);
  });
});
