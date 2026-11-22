import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSource } from '../../data/DataContext.tsx';
import type { SignedInUser } from '../../data/auth-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import type { TextKey } from '../../shared/i18n/dictionary.ts';
import './auth.css';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly user: SignedInUser | null };

/** Ce que la page dit du rôle de l'utilisateur connecté. */
function roleText({ role, adminExpired }: SignedInUser): TextKey {
  if (role === 'admin') return adminExpired ? 'auth.role.expired' : 'auth.role.admin';
  return role === 'member' ? 'auth.role.member' : 'auth.role.none';
}

/** Se connecter avec Discord, voir son rôle, se déconnecter (ADR 0030). */
export function LoginPage() {
  const { t } = useI18n();
  const auth = useAuthSource();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    auth.currentUser().then(
      (user) => {
        if (current) setState({ status: 'ready', user });
      },
      () => {
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [auth]);

  const signIn = (
    <button type="button" className="auth-button" onClick={() => void auth.signIn()}>
      {t('auth.signIn')}
    </button>
  );
  const signOut = (
    <button
      type="button"
      className="auth-button auth-button-secondary"
      onClick={() => {
        void auth.signOut().then(() => {
          setState({ status: 'ready', user: null });
        });
      }}
    >
      {t('auth.signOut')}
    </button>
  );

  return (
    <section className="auth-page">
      <h1 className="page-title">{t('auth.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">{t('auth.error')}</p>
          <div className="auth-actions">
            {signIn}
            {signOut}
          </div>
        </>
      )}
      {state.status === 'ready' && state.user === null && (
        <>
          <p>{t('auth.intro')}</p>
          {signIn}
        </>
      )}
      {state.status === 'ready' && state.user !== null && (
        <>
          <p>{t('auth.signedInAs', { name: state.user.name })}</p>
          <p>{t(roleText(state.user))}</p>
          {state.user.adminExpired ? (
            <div className="auth-actions">
              {signIn}
              {signOut}
            </div>
          ) : (
            <div className="auth-actions">
              {state.user.role === 'admin' && (
                <Link to="/admin" className="auth-button">
                  {t('auth.openAdmin')}
                </Link>
              )}
              {signOut}
            </div>
          )}
        </>
      )}
    </section>
  );
}
