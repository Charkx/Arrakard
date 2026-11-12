import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSite } from './testing/render.tsx';

function givenBrowserLanguage(language: string) {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
}

/** Un navigateur qui refuse le stockage local : navigation privée, réglage strict. */
function givenStorageIsBlocked() {
  const refuse = () => {
    throw new DOMException('Stockage refusé', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
}

function switchLanguage() {
  fireEvent.click(screen.getByRole('button', { name: /Switch to English|Passer en français/ }));
}

function pageTitle() {
  return screen.getByRole('heading', { level: 1 }).textContent;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('le site', () => {
  it('ouvre le classement à la racine, faute de page d’accueil', () => {
    openSite('/');

    expect(screen.getByTestId('address').textContent).toBe('/leaderboard');
  });

  it('s’affiche en français pour un navigateur en français', () => {
    givenBrowserLanguage('fr-FR');

    openSite('/leaderboard');

    expect(pageTitle()).toBe('Classement');
  });

  it('s’affiche en anglais pour un navigateur dans une autre langue', () => {
    givenBrowserLanguage('de-DE');

    openSite('/leaderboard');

    expect(pageTitle()).toBe('Leaderboard');
  });

  it('déclare sa langue dès le premier affichage', () => {
    givenBrowserLanguage('de-DE');

    openSite('/leaderboard');

    expect(document.documentElement.lang).toBe('en');
  });
});

describe('le bouton de langue', () => {
  it('passe le site du français à l’anglais', () => {
    givenBrowserLanguage('fr-FR');
    openSite('/leaderboard');

    switchLanguage();

    expect(pageTitle()).toBe('Leaderboard');
  });

  it('change aussi la langue que la page déclare', () => {
    givenBrowserLanguage('fr-FR');
    openSite('/leaderboard');

    switchLanguage();

    expect(document.documentElement.lang).toBe('en');
  });

  // Un vrai rechargement est simulé : le site est retiré, puis affiché de nouveau.
  it('garde le choix au rechargement de la page', () => {
    givenBrowserLanguage('fr-FR');
    const firstVisit = openSite('/leaderboard');
    switchLanguage();
    firstVisit.unmount();

    openSite('/leaderboard');

    expect(pageTitle()).toBe('Leaderboard');
  });

  it('fonctionne même si le navigateur refuse de garder le choix', () => {
    givenBrowserLanguage('fr-FR');
    givenStorageIsBlocked();
    openSite('/leaderboard');

    switchLanguage();

    expect(pageTitle()).toBe('Leaderboard');
  });
});
