import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { lazyAuthSource } from './data/auth-source.ts';
import { DataProvider } from './data/DataContext.tsx';
import { supabaseSource } from './data/supabase-source.ts';
import { I18nProvider } from './shared/i18n/i18n.tsx';
import './styles.css';

// La bibliothèque de connexion n'est téléchargée qu'au premier usage (ADR 0024).
const auth = lazyAuthSource(() =>
  import('./data/supabase-auth.ts').then(({ supabaseAuth }) => supabaseAuth()),
);

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable dans index.html.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <DataProvider source={supabaseSource()} auth={auth}>
          <App />
        </DataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
