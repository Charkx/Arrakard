import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { lazyAdminSource } from './data/admin-source.ts';
import { lazyAuthSource } from './data/auth-source.ts';
import { DataProvider } from './data/DataContext.tsx';
import { supabaseSource } from './data/supabase-source.ts';
import { I18nProvider } from './shared/i18n/i18n.tsx';
import './styles.css';

// La bibliothèque de connexion n'est téléchargée qu'au premier usage (ADR 0024),
// une fois pour la connexion et les lectures d'admin, qui partagent la session.
let session: Promise<import('./data/supabase-auth.ts').SupabaseSession> | undefined;
const loadSession = () =>
  (session ??= import('./data/supabase-auth.ts').then(({ supabaseSession }) => supabaseSession()));
const auth = lazyAuthSource(() => loadSession().then(({ auth }) => auth));
const admin = lazyAdminSource(() => loadSession().then(({ admin }) => admin));

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable dans index.html.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <DataProvider source={supabaseSource()} auth={auth} admin={admin}>
          <App />
        </DataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
