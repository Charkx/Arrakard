import { describe, expect, it } from 'vitest';
import { editionAtVersion } from '#contracts/edition.ts';

const VALID = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  editionId: '00000000-0000-4000-8000-00000000b001',
  version: 1,
};

describe('editionAtVersion', () => {
  it('accepte une organisation, une édition et une version', () => {
    expect(editionAtVersion.parse(VALID)).toEqual(VALID);
  });

  it.each([
    ['sans version', { organizationId: VALID.organizationId, editionId: VALID.editionId }],
    ['une version nulle', { ...VALID, version: 0 }],
    ['une version décimale', { ...VALID, version: 1.5 }],
    ['une édition qui n’est pas un identifiant', { ...VALID, editionId: 'IH #2' }],
    ['un champ en trop', { ...VALID, closedAt: '2026-11-22' }],
  ])('refuse %s', (_case, body) => {
    expect(editionAtVersion.safeParse(body).success).toBe(false);
  });
});
