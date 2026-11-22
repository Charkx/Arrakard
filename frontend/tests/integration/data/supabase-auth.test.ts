// @vitest-environment jsdom
import { AuthClient } from '@supabase/auth-js';
import { afterEach, describe, expect, it } from 'vitest';
import { supabaseAuth } from '#src/data/supabase-auth.ts';

/**
 * La connexion sur l'API locale (`pnpm db:start`, démonstration chargée).
 * Discord n'y est pas joignable : un compte par adresse e-mail tient lieu de
 * session, et on vérifie la lecture du rôle avec les droits de l'utilisateur.
 */
const API = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'sb_publishable_local';

afterEach(() => {
  localStorage.clear();
});

describe('la connexion par Supabase Auth', () => {
  it('ne trouve personne de connecté sur un navigateur neuf', async () => {
    expect(await supabaseAuth().currentUser()).toBeNull();
  });

  it('lit le rôle enregistré de l’utilisateur connecté : aucun, pour un nouveau compte', async () => {
    const client = new AuthClient({
      url: `${API}/auth/v1`,
      headers: { apikey: LOCAL_KEY },
      storageKey: 'arrakis_auth',
      persistSession: true,
      autoRefreshToken: false,
    });
    const { error } = await client.signUp({
      email: `site-${crypto.randomUUID()}@connexion.essai.local`,
      password: 'mot-de-passe-d-essai',
    });
    expect(error).toBeNull();

    expect(await supabaseAuth().currentUser()).toEqual({ name: '', role: null });
  });
});
