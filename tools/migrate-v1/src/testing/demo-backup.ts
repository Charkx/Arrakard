import type { V1Dump, V1Edition, V1Match, V1MatchRow, V1Player, V1Role, V1Team } from '../v1.ts';

/**
 * Sauvegarde de démonstration : une petite communauté entièrement inventée,
 * au format d'une sauvegarde v1. Elle sert aux tests d'écriture et au
 * développement des pages. Aucun joueur réel : les pseudos sont des mots de
 * marine, choisis pour ne ressembler à aucun pseudo de la communauté.
 *
 * Elle est déterministe : le même appel donne toujours la même sauvegarde.
 */

const ROLES: readonly V1Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

const CHAMPIONS: Record<V1Role, readonly string[]> = {
  TOP: ['Ornn', 'Gnar', 'Garen', 'Camille'],
  JGL: ['Vi', 'Sejuani', 'Lee Sin', 'Nocturne'],
  MID: ['Ahri', 'Orianna', 'Syndra', 'Viktor'],
  ADC: ['Jinx', "Kai'Sa", 'Ezreal', 'Ashe'],
  SUP: ['Nami', 'Rell', 'Thresh', 'Lulu'],
};

/** Une équipe, sa force (0 à 1) et ses cinq joueurs, dans l'ordre des rôles. */
const ROSTERS = [
  {
    tag: 'PHA',
    name: 'Les Phares',
    division: 'div1',
    strength: 0.75,
    players: ['Lanterne', 'Boussole', 'Sextant', 'Balise', 'Amarre'],
  },
  {
    tag: 'MAR',
    name: 'Marée Haute',
    division: 'div1',
    strength: 0.5,
    players: ['Gouvernail', 'Astrolabe', 'Cabestan', 'Ancre', 'Voilure'],
  },
  {
    tag: 'GLG',
    name: 'Grand Largue',
    division: 'div2',
    strength: 0.6,
    players: ['Misaine', 'Hauban', 'Drisse', 'Écoute', 'Carène'],
  },
  {
    tag: 'VDB',
    name: 'Vent Debout',
    division: 'div2',
    strength: 0.4,
    players: ['Étrave', 'Safran', 'Taquet', 'Winch', 'Bôme'],
  },
] as const;

/** Joueurs sans équipe, vus seulement en In House. Le dernier est archivé. */
const FREE_AGENTS = ['Vigie', 'Sillage', 'Épave'] as const;

const SEASON_2 = uuid(1, 2);
const SEASON_3 = uuid(1, 3);
const SPLIT_2 = uuid(2, 2);
const SPLIT_3 = uuid(2, 3);

export function demoBackup(): V1Dump {
  const random = seededRandom(20261112);

  const teams: V1Team[] = ROSTERS.map((roster, t) => ({
    id: uuid(3, t + 1),
    tag: roster.tag,
    name: roster.name,
    divisions: [roster.division],
    logo_url: null,
    archived_at: null,
  }));

  const players: V1Player[] = [
    ...ROSTERS.flatMap((roster, t) =>
      roster.players.map((name, p) => ({
        ...aPlayer(t * 5 + p + 1, name, teams[t], roster.tag),
        // Un joueur a personnalisé sa carte, un autre a seulement lié son compte Riot.
        ...(name === 'Sextant' && {
          customization: { title: 'navigateur', accounts: [{ riotId: 'Sextant#MER', main: true }] },
        }),
        ...(name === 'Gouvernail' && { riot_id: 'Gouvernail#MER' }),
      })),
    ),
    ...FREE_AGENTS.map((name, i) => ({
      ...aPlayer(ROSTERS.length * 5 + i + 1, name, undefined, null),
      archived: name === 'Épave',
    })),
  ];

  const editions: V1Edition[] = [
    anEdition(1, {
      name: 'Ligue D1 #1',
      type: 'ligue_div1',
      date: '2025-03-10',
      season_id: SEASON_2,
      split_id: SPLIT_2,
      prestige: 'championship',
      display_number: 1,
    }),
    anEdition(2, {
      name: 'Ligue D1 #2',
      type: 'ligue_div1',
      date: '2026-02-09',
      prestige: 'championship',
      display_number: 2,
      mvp_player_name: 'Boussole',
    }),
    anEdition(3, {
      name: 'Ligue D2 #1',
      type: 'ligue_div2',
      date: '2026-02-16',
      prestige: 'premium',
      display_number: 1,
    }),
    anEdition(4, {
      name: 'In House #1',
      type: 'inhouse',
      date: '2026-03-01',
      prestige: 'normal',
      display_number: 1,
    }),
    anEdition(6, {
      name: 'In House #2',
      type: 'inhouse',
      date: '2026-12-05',
      prestige: 'normal',
      display_number: 2,
      description: 'Soirée à venir : les inscriptions sont ouvertes.',
    }),
    anEdition(5, {
      name: 'LAN de printemps',
      type: 'external_event',
      date: '2026-04-12',
      prestige: 'normal',
      display_number: null,
      location: 'Lyon',
      description: 'Un tournoi en salle, hors Arrakis.',
      arrakis_won: true,
    }),
  ];

  const matches: V1Match[] = [];
  const match_rows: V1MatchRow[] = [];

  /** Joue un match entre deux alignements de cinq joueurs et l'enregistre. */
  const play = (
    edition: V1Edition,
    a: Lineup,
    b: Lineup,
    extra: Partial<Pick<V1Match, 'journee' | 'is_final'>> = {},
  ) => {
    const number = matches.filter((m) => m.edition_id === edition.id).length + 1;
    const matchId = uuid(6, matches.length + 1);
    const aWins = random() < 0.5 + (a.strength - b.strength) * 0.8;
    const minutes = 24 + Math.floor(random() * 16);
    matches.push({
      id: matchId,
      edition_id: edition.id,
      match_number: number,
      team_a: a.tag,
      team_b: b.tag,
      winner: aWins ? a.tag : b.tag,
      duration_display: `${minutes}:${String(Math.floor(random() * 60)).padStart(2, '0')}`,
      journee: extra.journee ?? null,
      is_final: extra.is_final ?? false,
    });
    ROLES.forEach((role, line) => {
      const sideA = aSide(role, aWins, minutes, random);
      const sideB = aSide(role, !aWins, minutes, random);
      match_rows.push({
        id: uuid(7, match_rows.length + 1),
        match_id: matchId,
        role,
        a_player_name: a.players[line] ?? '',
        a_team: a.tag,
        a_champion: sideA.champion,
        a_result: aWins ? 'WIN' : 'LOSE',
        a_kills: sideA.kills,
        a_deaths: sideA.deaths,
        a_assists: sideA.assists,
        a_gold: sideA.gold,
        b_player_name: b.players[line] ?? '',
        b_team: b.tag,
        b_champion: sideB.champion,
        b_result: aWins ? 'LOSE' : 'WIN',
        b_kills: sideB.kills,
        b_deaths: sideB.deaths,
        b_assists: sideB.assists,
        b_gold: sideB.gold,
      });
    });
  };

  const [dne, nox, orb, spc] = ROSTERS;
  const [league1, league2, leagueD2, inHouse, upcoming, lan] = editions as [
    V1Edition,
    V1Edition,
    V1Edition,
    V1Edition,
    V1Edition,
    V1Edition,
  ];

  // Saison 2 (clôturée) : une ligue de deux journées.
  for (const journee of [1, 1, 2, 2]) play(league1, dne, nox, { journee });
  // Saison 3 : une ligue D1 de trois journées, dont la finale.
  for (const journee of [1, 1, 2, 2, 3]) play(league2, dne, nox, { journee });
  play(league2, nox, dne, { journee: 3, is_final: true });
  // Saison 3 : une ligue D2.
  for (const journee of [1, 1, 2, 2, 3, 3]) play(leagueD2, orb, spc, { journee });
  // Saison 3 : une soirée In House, équipes mélangées le temps d'une soirée.
  const sand: Lineup = {
    tag: 'Bâbord',
    strength: 0.5,
    players: ['Lanterne', 'Hauban', 'Cabestan', 'Vigie', 'Bôme'],
  };
  const wind: Lineup = {
    tag: 'Tribord',
    strength: 0.5,
    players: ['Étrave', 'Astrolabe', 'Sillage', 'Balise', 'Épave'],
  };
  for (let i = 0; i < 3; i++) play(inHouse, sand, wind);

  const idOf = (name: string) => players.find((p) => p.name === name)?.id ?? '';

  return {
    seasons: [
      { id: SEASON_2, name: 'Saison 2', year: 2025 },
      { id: SEASON_3, name: 'Saison 3', year: 2026 },
    ],
    splits: [
      {
        id: SPLIT_2,
        season_id: SEASON_2,
        number: 1,
        name: 'Split 2025',
        start_date: '2025-01-06',
        end_date: '2025-12-14',
        is_active: false,
      },
      {
        id: SPLIT_3,
        season_id: SEASON_3,
        number: 1,
        name: 'Split 2026',
        start_date: '2026-01-05',
        end_date: null,
        is_active: true,
      },
    ],
    teams,
    players,
    editions,
    matches,
    match_rows,
    // Un événement externe n'a pas de match : seulement des participants.
    edition_participants: ['Sextant', 'Amarre', 'Gouvernail'].map((name) => ({
      edition_id: lan.id,
      player_id: idOf(name),
    })),
    // Deux inscriptions à la soirée à venir.
    registrations: [
      aRegistration(1, upcoming.id, 'Vigie', 'ADC'),
      aRegistration(2, upcoming.id, 'Sillage', 'MID'),
    ],
    player_event_entries: [],
  };
}

function aRegistration(n: number, editionId: string, pseudo: string, role: string) {
  return {
    id: uuid(8, n),
    edition_id: editionId,
    discord_user_id: `10000000000000000${n}`,
    pseudo,
    role,
    secondary_role: 'FILL',
    rank: 'Or II',
    opgg: null,
    alt_riot_id: null,
    speaks_english: n === 2,
    created_at: '2026-11-20T19:00:00Z',
  };
}

/**
 * La même sauvegarde avec d'autres identifiants. Les identifiants sont uniques
 * dans toute la base : il en faut de nouveaux pour charger la démonstration
 * dans une seconde organisation, comme le font les tests d'écriture.
 */
export function demoBackupCopy(copy: number): V1Dump {
  const original = JSON.stringify(demoBackup());
  return JSON.parse(
    original.replaceAll('-4000-8000-', `-4000-80${String(copy).padStart(2, '0')}-`),
  ) as V1Dump;
}

interface Lineup {
  readonly tag: string;
  readonly strength: number;
  readonly players: readonly string[];
}

function aPlayer(n: number, name: string, team: V1Team | undefined, tag: string | null): V1Player {
  return {
    id: uuid(4, n),
    name,
    archived: false,
    merged_into: null,
    discord_user_id: null,
    team_id: team?.id ?? null,
    team_tag: tag,
    status: 'starter',
    riot_id: null,
    customization: null,
    created_at: '2025-01-06T18:00:00Z',
  };
}

function anEdition(n: number, overrides: Partial<V1Edition>): V1Edition {
  return {
    id: uuid(5, n),
    season_id: SEASON_3,
    split_id: SPLIT_3,
    name: `Édition ${n}`,
    type: 'inhouse',
    date: '2026-01-05',
    prestige: 'normal',
    mvp_player_name: null,
    display_number: n,
    location: null,
    url: null,
    description: null,
    arrakis_won: null,
    source_file_hash: null,
    created_at: `${overrides.date ?? '2026-01-05'}T21:00:00Z`,
    ...overrides,
  };
}

/** Les statistiques d'un joueur sur un match : meilleures quand il gagne. */
function aSide(role: V1Role, won: boolean, minutes: number, random: () => number) {
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const carry = role === 'SUP' ? 0 : 1;
  return {
    champion: pick(CHAMPIONS[role]),
    kills: carry * (won ? between(2, 9) : between(0, 5)),
    deaths: won ? between(0, 4) : between(2, 7),
    assists: (won ? between(5, 14) : between(1, 8)) + (role === 'SUP' ? 5 : 0),
    gold: minutes * (role === 'SUP' ? between(230, 280) : between(350, 430)),
  };
}

/** Identifiant stable et lisible : le type de ligne, puis son numéro. */
function uuid(kind: number, n: number): string {
  return `0000000${kind}-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Générateur pseudo-aléatoire (mulberry32) : même graine, même suite. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
