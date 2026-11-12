import { describe, expect, it } from 'vitest';
import { assertTargetAllowed, LOCAL_DATABASE_URL } from './target.ts';

describe('assertTargetAllowed', () => {
  it.each([
    LOCAL_DATABASE_URL,
    'postgresql://postgres:postgres@localhost:54322/postgres',
    'postgresql://postgres:postgres@[::1]:54322/postgres',
  ])('accepte la base locale %s', (url) => {
    expect(() => {
      assertTargetAllowed(url, false);
    }).not.toThrow();
  });

  it('refuse une base hébergée sans confirmation, en nommant son hôte', () => {
    const hosted = 'postgresql://postgres:secret@db.exemple.supabase.co:5432/postgres';

    expect(() => {
      assertTargetAllowed(hosted, false);
    }).toThrow('db.exemple.supabase.co');
  });

  it('ne recopie jamais le mot de passe dans le message de refus', () => {
    const hosted = 'postgresql://postgres:secret@db.exemple.supabase.co:5432/postgres';

    let message = '';
    try {
      assertTargetAllowed(hosted, false);
    } catch (refusal) {
      message = String(refusal);
    }

    expect(message).toContain('db.exemple.supabase.co');
    expect(message).not.toContain('secret');
  });

  it('accepte une base hébergée avec la confirmation explicite', () => {
    const hosted = 'postgresql://postgres:secret@db.exemple.supabase.co:5432/postgres';

    expect(() => {
      assertTargetAllowed(hosted, true);
    }).not.toThrow();
  });
});
