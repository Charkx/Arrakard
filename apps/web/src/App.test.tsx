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

function browserLanguageIs(language: string) {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('la page provisoire', () => {
  it('s’affiche en français pour un navigateur en français', () => {
    browserLanguageIs('fr-FR');

    renderSite();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Le site arrive bientôt');
  });

  it('s’affiche en anglais pour un navigateur dans une autre langue', () => {
    browserLanguageIs('de-DE');

    renderSite();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The site is coming soon');
  });
});

describe('le bouton de langue', () => {
  it('passe la page du français à l’anglais', () => {
    browserLanguageIs('fr-FR');
    renderSite();

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The site is coming soon');
    expect(document.documentElement.lang).toBe('en');
  });

  it('garde le choix au rechargement de la page', () => {
    browserLanguageIs('fr-FR');
    const firstVisit = renderSite();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    firstVisit.unmount();

    renderSite();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The site is coming soon');
  });
});
