import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { DICTIONARY, LANGUAGES, type Language, type TextKey } from './dictionary.ts';

const STORAGE_KEY = 'arrakis_lang';

interface I18n {
  readonly language: Language;
  /** L'autre langue : celle que propose le bouton. */
  readonly otherLanguage: Language;
  readonly setLanguage: (language: Language) => void;
  /** Le texte d'une clé, dans la langue affichée. */
  readonly t: (key: TextKey) => string;
}

const I18nContext = createContext<I18n | null>(null);

function isLanguage(value: string | null): value is Language {
  return (LANGUAGES as readonly (string | null)[]).includes(value);
}

/** Le choix déjà fait par le visiteur, sinon la langue de son navigateur. */
function initialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(saved)) return saved;
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [language, setLanguage] = useState(initialLanguage);

  // La page annonce sa langue aux lecteurs d'écran et aux moteurs de recherche.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const i18n: I18n = {
    language,
    otherLanguage: language === 'fr' ? 'en' : 'fr',
    setLanguage: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setLanguage(next);
    },
    t: (key) => DICTIONARY[language][key],
  };

  return <I18nContext value={i18n}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error('useI18n s’utilise sous <I18nProvider>.');
  return i18n;
}
