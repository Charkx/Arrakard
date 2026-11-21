import { describe, expect, it } from 'vitest';
import { aPerformance, performances, performancesFrom } from '../testing/builders.ts';
import { explainRating } from './breakdown.ts';

/** Exemple A de la spec : 5 parties en JGL, 4 victoires, 19 / 8 / 44. */
const exampleA = performancesFrom({
  role: 'JGL',
  games: 5,
  wins: 4,
  kills: 19,
  deaths: 8,
  assists: 44,
});

describe('explainRating', () => {
  it('un joueur sans partie a une explication vide : note 60, aucune étape de calcul', () => {
    const noPerformance = [] as const;

    const breakdown = explainRating(noPerformance);

    expect(breakdown.result).toEqual({
      rating: 60,
      impact: 60,
      consistency: 60,
      clutch: 60,
      tier: 'bronze',
    });
    expect(breakdown.games).toBe(0);
    expect(breakdown.steps).toBeNull();
  });

  it('donne la note et les sous-notes de l’exemple A de la spec', () => {
    const breakdown = explainRating(exampleA);

    expect(breakdown.result).toEqual({
      rating: 80,
      impact: 93,
      consistency: 68,
      clutch: 80,
      tier: 'gold',
    });
    expect(breakdown.games).toBe(5);
  });

  it('dit le rôle dominant et la médiane de rôle qui sert de référence', () => {
    const breakdown = explainRating(exampleA);

    expect(breakdown.steps?.dominantRole).toBe('JGL');
    expect(breakdown.steps?.roleBaseline).toEqual({ kda: 3, winrate: 0.5 });
  });

  describe('fiabilité', () => {
    it('à 15 parties, elle vaut 1 : les statistiques ne sont pas tirées vers la médiane', () => {
      const fifteenGames = performancesFrom({
        role: 'MID',
        games: 15,
        wins: 12,
        kills: 30,
        deaths: 10,
        assists: 30,
      });

      const breakdown = explainRating(fifteenGames);

      expect(breakdown.steps?.reliability).toBe(1);
      expect(breakdown.steps?.kda).toMatchObject({ weighted: 6, reliable: 6 });
      expect(breakdown.steps?.winrate).toMatchObject({ weighted: 0.8, reliable: 0.8 });
    });
  });

  describe('fiabilité sous 15 parties (exemple A de la spec)', () => {
    it('vaut le nombre de parties divisé par 15', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.reliability).toBeCloseTo(5 / 15);
    });

    it('tire le KDA vers la médiane du rôle : 7,875 devient 4,625', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.kda.weighted).toBeCloseTo(7.875);
      expect(breakdown.steps?.kda.reliable).toBeCloseTo(4.625);
    });

    it('tire le winrate vers la médiane du rôle : 80 % devient 60 %', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.winrate.weighted).toBeCloseTo(0.8);
      expect(breakdown.steps?.winrate.reliable).toBeCloseTo(0.6);
    });
  });

  describe('prestige', () => {
    it('donne le KDA avant et après la pondération par le prestige', () => {
      const deathsInBigEvent = [
        aPerformance({ role: 'MID', deaths: 10, weight: 1.6 }),
        ...performances(14, { role: 'MID', assists: 3, weight: 1 }),
      ];

      const breakdown = explainRating(deathsInBigEvent);

      // 42 assists pour 10 morts ; les 10 morts pèsent 16 une fois pondérées.
      expect(breakdown.steps?.kda.unweighted).toBeCloseTo(4.2);
      expect(breakdown.steps?.kda.weighted).toBeCloseTo(2.625);
    });

    it('donne le winrate avant et après la pondération par le prestige', () => {
      const lossesInBigEvents = [
        ...performances(10, { role: 'MID', result: 'win', weight: 1 }),
        ...performances(5, { role: 'MID', result: 'loss', weight: 1.6 }),
      ];

      const breakdown = explainRating(lossesInBigEvents);

      expect(breakdown.steps?.winrate.unweighted).toBeCloseTo(10 / 15);
      expect(breakdown.steps?.winrate.weighted).toBeCloseTo(10 / 18);
    });
  });

  describe('plafond du KDA', () => {
    it('signale un KDA plafonné à 8, et garde sa valeur d’avant le plafond', () => {
      const stomp = [
        aPerformance({ role: 'MID', result: 'win', kills: 150, deaths: 0 }),
        ...performances(14, { role: 'MID', result: 'loss' }),
      ];

      const breakdown = explainRating(stomp);

      expect(breakdown.steps?.kda).toMatchObject({ weighted: 150, capped: true, reliable: 8 });
    });

    it('ne signale rien sous le plafond', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.kda.capped).toBe(false);
    });
  });

  describe('bornes', () => {
    it('garde les scores d’avant les bornes, comme le score de 104 derrière un impact de 99 (exemple B)', () => {
      const exampleB = performancesFrom({
        role: 'JGL',
        games: 24,
        wins: 19,
        kills: 165,
        deaths: 74,
        assists: 219,
      });

      const breakdown = explainRating(exampleB);

      expect(breakdown.result.impact).toBe(99);
      expect(breakdown.steps?.scores.kda).toBeCloseTo(103.78, 2);
      expect(breakdown.steps?.scores.winrate).toBeCloseTo(82.75, 2);
      expect(breakdown.steps?.scores.clutch).toBeCloseTo(93.27, 2);
    });

    it('donne la note d’avant le plancher : 56 remontée à 60 (joueur F de la spec)', () => {
      const playerF = performancesFrom({
        role: 'JGL',
        games: 3,
        wins: 1,
        kills: 17,
        deaths: 29,
        assists: 24,
      });

      const breakdown = explainRating(playerF);

      expect(breakdown.steps?.ratingBeforeFloor).toBe(56);
      expect(breakdown.result.rating).toBe(60);
    });
  });

  describe('palier suivant', () => {
    it('donne l’écart au palier suivant : une note de 78 est à 2 points de l’Or (joueur D de la spec)', () => {
      const playerD = performancesFrom({
        role: 'SUP',
        games: 20,
        wins: 11,
        kills: 29,
        deaths: 54,
        assists: 305,
      });

      const breakdown = explainRating(playerD);

      expect(breakdown.nextTier).toEqual({ tier: 'gold', pointsMissing: 2 });
    });

    it('un joueur sans partie est à 10 points de l’Argent', () => {
      const breakdown = explainRating([]);

      expect(breakdown.nextTier).toEqual({ tier: 'silver', pointsMissing: 10 });
    });
  });

  describe('palier suivant, en haut de l’échelle', () => {
    it('une note de 80 vise l’Élite, à 10 points', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.nextTier).toEqual({ tier: 'elite', pointsMissing: 10 });
    });

    it('un joueur Élite n’a aucun palier suivant', () => {
      const elite = performances(15, { role: 'MID', result: 'win', kills: 8, deaths: 1 });

      const breakdown = explainRating(elite);

      expect(breakdown.result.tier).toBe('elite');
      expect(breakdown.nextTier).toBeNull();
    });
  });

  describe('cas limites relevés à la revue', () => {
    it('le rôle dominant est le plus joué, pas le premier rencontré : 2 MID puis 4 SUP donnent SUP', () => {
      const mostlySupport = [
        ...performances(2, { role: 'MID' }),
        ...performances(4, { role: 'SUP' }),
      ];

      const breakdown = explainRating(mostlySupport);

      expect(breakdown.steps?.dominantRole).toBe('SUP');
      expect(breakdown.steps?.roleBaseline).toEqual({ kda: 4, winrate: 0.5 });
    });

    it('un KDA de 8 tout juste n’est pas signalé comme plafonné', () => {
      const exactlyEight = performances(15, { role: 'MID', kills: 8, deaths: 1 });

      const breakdown = explainRating(exactlyEight);

      expect(breakdown.steps?.kda).toMatchObject({ weighted: 8, capped: false });
    });
  });

  describe('plafond et fiabilité cumulés', () => {
    it('sépare ce que fait le plafond de ce que fait la fiabilité', () => {
      const threeBigGames = [
        aPerformance({ role: 'MID', kills: 30, deaths: 1 }),
        ...performances(2, { role: 'MID' }),
      ];

      const breakdown = explainRating(threeBigGames);

      // KDA 30 → plafonné à 8 → 3 parties sur 15 : 8 × 0,2 + 3 × 0,8 = 4.
      expect(breakdown.steps?.kda.weighted).toBe(30);
      expect(breakdown.steps?.kda.afterCap).toBe(8);
      expect(breakdown.steps?.kda.reliable).toBeCloseTo(4);
    });
  });

  describe('apport des sous-notes', () => {
    it('dit combien de points chaque sous-note apporte à la note (exemple A de la spec)', () => {
      const breakdown = explainRating(exampleA);

      // 93 × 0,35 + 68 × 0,35 + 80 × 0,30 = 32,55 + 23,8 + 24 = 80,35 → 80.
      expect(breakdown.steps?.contributions.impact).toBeCloseTo(32.55);
      expect(breakdown.steps?.contributions.consistency).toBeCloseTo(23.8);
      expect(breakdown.steps?.contributions.clutch).toBeCloseTo(24);
    });
  });
});
