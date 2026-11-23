import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './shared/components/Navbar.tsx';
import { useI18n } from './shared/i18n/i18n.tsx';
import { AdminPage } from './features/admin/AdminPage.tsx';
import { EditionFormPage } from './features/admin/EditionFormPage.tsx';
import { MatchEntryPage } from './features/admin/MatchEntryPage.tsx';
import { ProfilesPage } from './features/admin/ProfilesPage.tsx';
import { TeamsPage } from './features/admin/TeamsPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { EditionPage } from './features/edition/EditionPage.tsx';
import { LeaderboardPage } from './features/leaderboard/LeaderboardPage.tsx';
import { PlayerPage } from './features/player/PlayerPage.tsx';

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/teams" element={<TeamsPage />} />
          <Route path="/admin/profiles" element={<ProfilesPage />} />
          <Route path="/admin/editions/new" element={<EditionFormPage />} />
          <Route path="/admin/editions/:editionId" element={<EditionFormPage />} />
          <Route path="/admin/editions/:editionId/match" element={<MatchEntryPage />} />
          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </main>
    </>
  );
}
