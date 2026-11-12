import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { DataProvider } from './data/DataContext.tsx';
import { supabaseSource } from './data/supabase-source.ts';
import { I18nProvider } from './i18n/i18n.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable dans index.html.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <DataProvider source={supabaseSource()}>
          <App />
        </DataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
