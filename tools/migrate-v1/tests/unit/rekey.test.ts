import { describe, expect, it } from 'vitest';
import { planForOrganization, PRODUCTION_SLUG } from '#src/rekey.ts';
import { planMigration } from '#src/plan.ts';
import { demoBackup } from '#support/demo-backup.ts';

const plan = planMigration(demoBackup());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('planForOrganization (ADR 0021)', () => {
  it('garde les identifiants de la v1 pour l’organisation de production', () => {
    expect(planForOrganization(plan, PRODUCTION_SLUG)).toBe(plan);
  });

  it('donne à chaque édition, chaque match et chaque joueur un identifiant neuf', () => {
    const { rows } = planForOrganization(plan, 'arrakis-essai');

    const before = new Set(
      [...plan.rows.editions, ...plan.rows.matches, ...plan.rows.players].map((r) => r.id),
    );
    const after = [...rows.editions, ...rows.matches, ...rows.players].map((r) => r.id);
    expect(after.every((id) => UUID.test(id) && !before.has(id))).toBe(true);
    expect(new Set(after).size).toBe(after.length);
  });

  it('garde les liens entre lignes : un match cite toujours son édition', () => {
    const { rows } = planForOrganization(plan, 'arrakis-essai');

    const editions = new Set(rows.editions.map((e) => e.id));
    const players = new Set(rows.players.map((p) => p.id));
    expect(rows.matches.every((m) => editions.has(m.edition_id))).toBe(true);
    expect(rows.performances.every((p) => players.has(p.player_id))).toBe(true);
  });

  it('donne les mêmes identifiants à chaque chargement, et d’autres à une autre organisation', () => {
    const once = planForOrganization(plan, 'arrakis-essai');
    const twice = planForOrganization(plan, 'arrakis-essai');
    const other = planForOrganization(plan, 'autre-essai');

    expect(twice.rows).toEqual(once.rows);
    expect(other.rows.editions[0]?.id).not.toBe(once.rows.editions[0]?.id);
  });

  it('ne touche à rien d’autre que les identifiants', () => {
    const { rows } = planForOrganization(plan, 'arrakis-essai');

    expect(rows.players.map((p) => p.nickname)).toEqual(plan.rows.players.map((p) => p.nickname));
    expect(rows.editions.map((e) => [e.name, e.date])).toEqual(
      plan.rows.editions.map((e) => [e.name, e.date]),
    );
  });
});
