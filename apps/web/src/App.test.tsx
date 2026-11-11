import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { I18nProvider } from './i18n/i18n.tsx';

function renderSite() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

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

function switchToEnglish() {
  fireEvent.click(screen.getByRole('button', { name: 'English' }));
}

function pageTitle() {
  return screen.getByRole('heading', { level: 1 }).textContent;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('la page provisoire', () => {
  it('s’affiche en français pour un navigateur en français', () => {
    givenBrowserLanguage('fr-FR');

    renderSite();

    expect(pageTitle()).toBe('Le site arrive bientôt');
  });

  it('s’affiche en anglais pour un navigateur dans une autre langue', () => {
    givenBrowserLanguage('de-DE');

    renderSite();

    expect(pageTitle()).toBe('The site is coming soon');
  });

  it('déclare sa langue dès le premier affichage', () => {
    givenBrowserLanguage('de-DE');

    renderSite();

    expect(document.documentElement.lang).toBe('en');
  });
});

describe('le bouton de langue', () => {
  it('passe la page du français à l’anglais', () => {
    givenBrowserLanguage('fr-FR');
    renderSite();

    switchToEnglish();

    expect(pageTitle()).toBe('The site is coming soon');
  });

  it('change aussi la langue que la page déclare', () => {
    givenBrowserLanguage('fr-FR');
    renderSite();

    switchToEnglish();

    expect(document.documentElement.lang).toBe('en');
  });

  // Un vrai rechargement est simulé : la page est retirée, puis affichée de nouveau.
  it('garde le choix au rechargement de la page', () => {
    givenBrowserLanguage('fr-FR');
    const firstVisit = renderSite();
    switchToEnglish();
    firstVisit.unmount();

    renderSite();

    expect(pageTitle()).toBe('The site is coming soon');
  });

  it('fonctionne même si le navigateur refuse de garder le choix', () => {
    givenBrowserLanguage('fr-FR');
    givenStorageIsBlocked();
    renderSite();

    switchToEnglish();

    expect(pageTitle()).toBe('The site is coming soon');
  });
});
