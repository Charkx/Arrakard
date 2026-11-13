import { explainRating } from '@arrakis/domain';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from '../App.tsx';
import { DataProvider } from '../data/DataContext.tsx';
import type { DataSource, LeaderboardData, LeaderboardEntry } from '../data/leaderboard.ts';
import type { EditionPageData } from '../data/edition.ts';
import type { PlayedMatch, PlayerPageData, PlayerProfile } from '../data/player.ts';
import { I18nProvider } from '../i18n/i18n.tsx';

/** Un joueur du classement : chaque test ne précise que ce qui compte pour lui. */
export function anEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    playerId: 'p-lanterne',
    nickname: 'Lanterne',
    archived: false,
    role: 'MID',
    teamTag: 'PHA',
    divisions: ['div1'],
    rating: 75,
    impact: 75,
    consistency: 75,
    clutch: 75,
    tier: 'silver',
    games: 10,
    winrate: 50,
    kda: 3,
    recentForm: 'stable',
    editionsPlayed: 2,
    ...overrides,
  };
}

/** Un profil de joueur, avec une note de saison par défaut. */
export function aProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    playerId: 'p-lanterne',
    nickname: 'Lanterne',
    teamTag: 'PHA',
    teamName: 'Les Phares',
    seasonName: 'Saison 3',
    // L'exemple A de la spécification de la note : 5 parties, 4 victoires, 19 / 8 / 44.
    season: {
      role: 'JGL',
      rating: 80,
      impact: 93,
      consistency: 68,
      clutch: 80,
      tier: 'gold',
      games: 5,
      wins: 4,
      losses: 1,
      winrate: 80,
      kda: 7.88,
      recentForm: 'up',
      previousRating: 77,
      editionsPlayed: 2,
      topChampions: ['Ornn', 'Gnar', 'Garen'],
      breakdown: explainRating([
        ...Array.from({ length: 4 }, (_, i) => ({
          role: 'JGL' as const,
          result: 'win' as const,
          kills: i === 0 ? 19 : 0,
          deaths: i === 0 ? 8 : 0,
          assists: i === 0 ? 44 : 0,
          weight: 1,
        })),
        { role: 'JGL', result: 'loss', kills: 0, deaths: 0, assists: 0, weight: 1 },
      ]),
    },
    ...overrides,
  };
}

/** Un match d'un joueur. */
export function aMatch(overrides: Partial<PlayedMatch> = {}): PlayedMatch {
  return {
    matchId: 'm-1',
    editionId: 'e-1',
    editionName: 'Ligue D1 #2',
    editionDate: '2026-02-09',
    matchNumber: 1,
    matchday: null,
    role: 'TOP',
    champion: 'Ornn',
    result: 'win',
    kills: 3,
    deaths: 1,
    assists: 7,
    ...overrides,
  };
}

export interface SiteData {
  readonly leaderboard?: LeaderboardData | 'fails';
  /** Les joueurs, par identifiant. Un identifiant absent mène à « joueur introuvable ». */
  readonly players?: Readonly<Record<string, PlayerPageData>> | 'fails';
  /** Les joueurs fusionnés : ancien identifiant → joueur conservé. */
  readonly merged?: Readonly<Record<string, string>>;
  /** Les éditions, par identifiant. */
  readonly editions?: Readonly<Record<string, EditionPageData>> | 'fails';
}

/** Une source qui sert des données en mémoire, ou qui échoue. */
export function inMemorySource({
  leaderboard = { seasonName: 'Saison 3', entries: [] },
  players = {},
  merged = {},
  editions = {},
}: SiteData): DataSource {
  const fails = () => Promise.reject(new Error('Base injoignable'));
  return {
    loadLeaderboard: () => (leaderboard === 'fails' ? fails() : Promise.resolve(leaderboard)),
    loadPlayer: (id) => {
      if (players === 'fails') return fails();
      const into = merged[id];
      return Promise.resolve(into === undefined ? (players[id] ?? null) : { mergedInto: into });
    },
    loadEdition: (id) => (editions === 'fails' ? fails() : Promise.resolve(editions[id] ?? null)),
  };
}

/** Affiche l'adresse courante, pour vérifier où le site mène. */
function Address() {
  const { pathname, search } = useLocation();
  return <output data-testid="address">{pathname + search}</output>;
}

/** Ouvre le site à une adresse, avec ses données. */
export function openSite(address: string, data: LeaderboardData | 'fails' | SiteData = {}) {
  const site: SiteData = data === 'fails' || 'entries' in data ? { leaderboard: data } : data;
  return render(
    <MemoryRouter initialEntries={[address]}>
      <I18nProvider>
        <DataProvider source={inMemorySource(site)}>
          <App />
          <Address />
        </DataProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}
