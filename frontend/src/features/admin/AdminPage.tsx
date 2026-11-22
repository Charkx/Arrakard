import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAdminSource, useAuthSource } from '../../data/DataContext.tsx';
import type { ActiveSeason, AdminSource } from '../../data/admin-source.ts';
import type { AuthSource } from '../../data/auth-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { todayInParis } from '../../shared/today.ts';
import { bySeason, isFreshAdmin, type AdminEdition, type AdminSeasonSection } from './admin.ts';
import { SeasonPanel } from './SeasonPanel.tsx';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'refused' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly name: string;
      readonly editions: AdminEdition[];
      readonly activeSeason: ActiveSeason | null;
    };

/** Un admin à jour, puis ses éditions ; sinon, un refus (ADR 0030). */
async function loadAdmin(auth: AuthSource, admin: AdminSource): Promise<State> {
  const user = await auth.currentUser();
  if (!isFreshAdmin(user)) return { status: 'refused' };
  const [editions, activeSeason] = await Promise.all([admin.editions(), admin.activeSeason()]);
  return { status: 'ready', name: user.name, editions, activeSeason };
}

/** L'espace admin : les éditions de l'organisation, par saison (ticket #42). */
export function AdminPage() {
  const { t } = useI18n();
  const auth = useAuthSource();
  const admin = useAdminSource();
  const [state, setState] = useState<State>({ status: 'loading' });
  // Une commande réussie recharge la page : le serveur dit ce qui a changé.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    loadAdmin(auth, admin).then(
      (loaded) => {
        if (current) setState(loaded);
      },
      () => {
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [auth, admin, version]);

  if (state.status === 'refused') return <Navigate to="/login" replace />;

  return (
    <section className="admin-page">
      <h1 className="page-title">{t('admin.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.error')}</p>}
      {state.status === 'ready' && (
        <>
          <p className="admin-who">{t('admin.signedInAs', { name: state.name })}</p>
          <nav className="admin-links">
            <Link className="admin-back" to="/admin/teams">
              {t('admin.teams.link')}
            </Link>
            <Link className="admin-back" to="/admin/profiles">
              {t('admin.profiles.link.nav')}
            </Link>
          </nav>
          <SeasonPanel
            activeSeason={state.activeSeason}
            onChanged={() => {
              setVersion((v) => v + 1);
            }}
          />
          {state.editions.length === 0 ? (
            <p>{t('admin.empty')}</p>
          ) : (
            bySeason(state.editions, todayInParis()).map((section) => (
              <SeasonSection key={section.season?.id ?? 'none'} section={section} />
            ))
          )}
        </>
      )}
    </section>
  );
}

function SeasonSection({ section }: { readonly section: AdminSeasonSection }) {
  const { t, language } = useI18n();
  const date = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const { season } = section;
  const title =
    season === null
      ? t('admin.season.none')
      : t(season.status === 'open' ? 'admin.season.open' : 'admin.season.closed', {
          season: season.name,
        });

  return (
    <section className="admin-season" aria-label={title}>
      <h2 className="admin-season-title">{title}</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">{t('admin.col.edition')}</th>
            <th scope="col">{t('admin.col.type')}</th>
            <th scope="col">{t('admin.col.date')}</th>
            <th scope="col">{t('admin.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {section.editions.map((edition) => (
            <tr key={edition.editionId}>
              <td className="admin-edition-name">
                <Link to={`/event/${edition.editionId}`}>{edition.name}</Link>
                {/* Sur téléphone, la colonne Type disparaît : le type passe ici, sous le nom. */}
                <span className="admin-type-under" aria-hidden="true">
                  {t(`edition.type.${edition.type}`)}
                </span>
              </td>
              <td>{t(`edition.type.${edition.type}`)}</td>
              <td>{date.format(new Date(edition.date))}</td>
              <td>
                <span className={`admin-status ${edition.status}`}>
                  {t(`edition.status.${edition.status}`)}
                </span>
                {edition.draftCount > 0 && (
                  <span className="admin-drafts">
                    {edition.draftCount === 1
                      ? t('admin.drafts.one')
                      : t('admin.drafts', { n: edition.draftCount })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
