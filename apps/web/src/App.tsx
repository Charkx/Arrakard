import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { useI18n } from './i18n/i18n.tsx';
import { EditionPage } from './pages/EditionPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { PlayerPage } from './pages/PlayerPage.tsx';

/** Le site : la barre de navigation, puis la page de l'adresse. Adresses de la v1. */
export function App() {
  const { t } = useI18n();

  return (
    <>
      <Navbar />
      {/* Tranche 1 : la v2 se lit, la v1 reste l'outil des admins (ADR 0011). */}
      <p role="note" className="read-only-banner">
        {t('banner.readOnly')}
      </p>
      <main className="main-content">
        <Routes>
          {/* Pas encore de page d'accueil : le classement en tient lieu. */}
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/player/:id" element={<PlayerPage />} />
          <Route path="/event/:id" element={<EditionPage />} />
          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </main>
    </>
  );
}
