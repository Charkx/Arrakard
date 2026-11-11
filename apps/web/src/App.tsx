import { useI18n } from './i18n/i18n.tsx';

/** Page provisoire : elle prouve que le socle tient, avant les vraies pages. */
export function App() {
  const { t, otherLanguage, setLanguage } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-base font-body text-primary">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-2xl tracking-widest text-violet">{t('site.name')}</span>
        <button
          type="button"
          lang={otherLanguage}
          onClick={() => {
            setLanguage(otherLanguage);
          }}
          className="rounded-md border border-soft px-3 py-1 text-sm text-secondary hover:text-primary"
        >
          {t('language.switchTo')}
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-5xl tracking-wide">{t('placeholder.title')}</h1>
        <p className="max-w-md text-secondary">{t('placeholder.body')}</p>
      </main>
    </div>
  );
}
