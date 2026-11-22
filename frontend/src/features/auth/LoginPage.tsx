import { useEffect, useState } from 'react';
import { useAuthSource } from '../../data/DataContext.tsx';
import type { SignedInUser } from '../../data/auth-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import type { TextKey } from '../../shared/i18n/dictionary.ts';
import './auth.css';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly user: SignedInUser | null };

const ROLE_TEXT: Readonly<Record<'admin' | 'member' | 'none', TextKey>> = {
  admin: 'auth.role.admin',
  member: 'auth.role.member',
  none: 'auth.role.none',
};

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

  return (
    <section className="auth-page">
      <h1 className="page-title">{t('auth.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">{t('auth.error')}</p>
          {signIn}
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
          <p>{t(ROLE_TEXT[state.user.role ?? 'none'])}</p>
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
        </>
      )}
    </section>
  );
}
