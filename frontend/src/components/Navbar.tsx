import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.tsx';

/** Barre de navigation, reprise de la v1 : la marque, les pages, la langue. */
export function Navbar() {
  const { t, otherLanguage, setLanguage } = useI18n();

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="navbar-brand-a">A</span>RRAKIS
      </NavLink>
      <div className="navbar-links">
        <NavLink
          to="/leaderboard"
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          {t('nav.leaderboard')}
        </NavLink>
        <button
          type="button"
          className="lang-toggle"
          lang={otherLanguage}
          aria-label={t('lang.switch.label')}
          title={t('lang.switch.label')}
          onClick={() => {
            setLanguage(otherLanguage);
          }}
        >
          {t('lang.switch')}
        </button>
      </div>
    </nav>
  );
}
