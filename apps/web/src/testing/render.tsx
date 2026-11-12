import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from '../App.tsx';
import { DataProvider } from '../data/DataContext.tsx';
import type { DataSource, LeaderboardData, LeaderboardEntry } from '../data/leaderboard.ts';
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

/** Une source qui sert des données en mémoire, ou qui échoue. */
export function inMemorySource(data: LeaderboardData | 'fails'): DataSource {
  return {
    loadLeaderboard: () =>
      data === 'fails' ? Promise.reject(new Error('Base injoignable')) : Promise.resolve(data),
  };
}

/** Affiche l'adresse courante, pour vérifier où le site mène. */
function Address() {
  const { pathname, search } = useLocation();
  return <output data-testid="address">{pathname + search}</output>;
}

/** Ouvre le site à une adresse, avec ses données. */
export function openSite(
  address: string,
  data: LeaderboardData | 'fails' = { seasonName: 'Saison 3', entries: [] },
) {
  return render(
    <MemoryRouter initialEntries={[address]}>
      <I18nProvider>
        <DataProvider source={inMemorySource(data)}>
          <App />
          <Address />
        </DataProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}
