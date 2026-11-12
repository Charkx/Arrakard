import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.tsx';

/** Le profil d'un joueur : à venir (ticket #13). L'adresse est déjà celle de la v1. */
export function PlayerPage() {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <p>{t('profile.soon')}</p>
      <Link to="/leaderboard" className="navbar-link">
        {t('profile.back')}
      </Link>
    </div>
  );
}
