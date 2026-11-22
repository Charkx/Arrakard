import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthSource } from '../../data/DataContext.tsx';
import type { AuthSource } from '../../data/auth-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { todayInParis } from '../../shared/today.ts';
import { bySeason, type AdminEdition, type AdminSeasonSection } from './admin.ts';
import './admin.css';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'refused' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly name: string; readonly editions: AdminEdition[] };

/** Un admin à jour, puis ses éditions ; sinon, un refus (ADR 0030). */
async function loadAdmin(auth: AuthSource): Promise<State> {
  const user = await auth.currentUser();
  if (user?.role !== 'admin' || user.adminExpired) return { status: 'refused' };
  return { status: 'ready', name: user.name, editions: await auth.adminEditions() };
}

/** L'espace admin : les éditions de l'organisation, par saison (ticket #42). */
export function AdminPage() {
  const { t } = useI18n();
  const auth = useAuthSource();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    loadAdmin(auth).then(
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
  }, [auth]);

  if (state.status === 'refused') return <Navigate to="/login" replace />;

  return (
    <section className="admin-page">
      <h1 className="page-title">{t('admin.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.error')}</p>}
      {state.status === 'ready' && (
        <>
          <p className="admin-who">{t('admin.signedInAs', { name: state.name })}</p>
          {state.editions.length === 0 ? (
            <p>{t('admin.empty')}</p>
          ) : (
            bySeason(state.editions, todayInParis()).map((section) => (
              <SeasonSection key={section.seasonId ?? 'none'} section={section} />
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
  const title =
    section.seasonName === null
      ? t('admin.season.none')
      : t(section.open ? 'admin.season.open' : 'admin.season.closed', {
          season: section.seasonName,
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
