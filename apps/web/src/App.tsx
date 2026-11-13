import { Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { EditionPage } from './pages/EditionPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { PlayerPage } from './pages/PlayerPage.tsx';

/** Le site : la barre de navigation, puis la page de l'adresse. Adresses de la v1. */
export function App() {
  return (
    <>
      <Navbar />
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
