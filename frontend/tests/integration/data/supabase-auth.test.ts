// @vitest-environment jsdom
import { AuthClient } from '@supabase/auth-js';
import { afterEach, describe, expect, it } from 'vitest';
import { supabaseAuth } from '#src/data/supabase-auth.ts';
import { supabaseConfig } from '#src/data/supabase-config.ts';

/**
 * La connexion sur l'API locale (`pnpm db:start`, démonstration chargée).
 * Discord n'y est pas joignable : un compte par adresse e-mail tient lieu de
 * session, et on vérifie la lecture du rôle avec les droits de l'utilisateur.
 */
const { api, key } = supabaseConfig();

afterEach(() => {
  localStorage.clear();
});

describe('la connexion par Supabase Auth', () => {
  it('dit que la connexion a échoué quand Discord l’a refusée', async () => {
    window.history.replaceState(null, '', '/login?error=access_denied');

    await expect(supabaseAuth().currentUser()).rejects.toThrow('access_denied');
    window.history.replaceState(null, '', '/');
  });

  it('ne trouve personne de connecté sur un navigateur neuf', async () => {
    expect(await supabaseAuth().currentUser()).toBeNull();
  });

  it('lit le rôle enregistré de l’utilisateur connecté : aucun, pour un nouveau compte', async () => {
    const client = new AuthClient({
      url: `${api}/auth/v1`,
      headers: { apikey: key },
      storageKey: 'arrakis_auth',
      persistSession: true,
      autoRefreshToken: false,
    });
    const { error } = await client.signUp({
      email: `site-${crypto.randomUUID()}@connexion.essai.local`,
      password: 'mot-de-passe-d-essai',
    });
    expect(error).toBeNull();

    expect(await supabaseAuth().currentUser()).toEqual({
      name: '',
      role: null,
      adminExpired: false,
    });
  });
});
