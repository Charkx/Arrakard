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
    season: {
      role: 'TOP',
      rating: 86,
      impact: 91,
      consistency: 79,
      clutch: 85,
      tier: 'gold',
      games: 22,
      wins: 15,
      losses: 7,
      winrate: 68,
      kda: 4.55,
      recentForm: 'up',
      previousRating: 83,
      editionsPlayed: 4,
      topChampions: ['Ornn', 'Gnar', 'Garen'],
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
