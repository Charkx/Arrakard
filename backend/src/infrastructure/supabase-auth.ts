import type { Authenticator } from './http.ts';

/**
 * Identifie l'utilisateur auprès de Supabase Auth, qui vérifie lui-même le
 * jeton : aucune clé de signature à connaître ici.
 */
export function supabaseAuthenticator(supabaseUrl: string, apiKey: string): Authenticator {
  return {
    async userId(request) {
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) return undefined;
      const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: apiKey },
      });
      if (!response.ok) return undefined;
      const user = (await response.json()) as { id?: unknown };
      return typeof user.id === 'string' ? user.id : undefined;
    },
  };
}
