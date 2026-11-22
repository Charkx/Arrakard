/** L'API locale (`pnpm db:start`), et sa clé publique (voir `frontend/src/data/supabase-source.ts`). */
const API = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'sb_publishable_local';

export interface SignedUp {
  readonly id: string;
  readonly token: string;
}

/** Crée un compte par l'API de connexion, et rend son identifiant et son jeton. */
export async function signUp(email: string): Promise<SignedUp> {
  const response = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: LOCAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'mot-de-passe-d-essai' }),
  });
  const body = (await response.json()) as { access_token?: string; user?: { id: string } };
  if (!body.access_token || !body.user) {
    throw new Error(`Inscription de ${email} impossible : ${JSON.stringify(body)}`);
  }
  return { id: body.user.id, token: body.access_token };
}

/** Appelle une Edge Function comme le site, avec ou sans jeton de connexion. */
export function callFunction(name: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${API}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: LOCAL_KEY,
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}
