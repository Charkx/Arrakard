import { describe, expect, it } from 'vitest';
import { discordGateway } from '#infrastructure/discord.ts';

const GUILD = '1031291061936595015';

/** Un faux `fetch` qui note la requête et rend cette réponse. */
function answering(status: number, body?: unknown) {
  const requests: Request[] = [];
  const fetchFn = (input: string | URL | Request, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return Promise.resolve(
      body === undefined ? new Response(null, { status }) : Response.json(body, { status }),
    );
  };
  return { gateway: discordGateway('https://discord.test/api/v10/', fetchFn), requests };
}

describe('discordGateway', () => {
  it('demande à Discord le membre du serveur, avec le jeton de l’utilisateur', async () => {
    const { gateway, requests } = answering(200, {
      user: { id: '42', username: 'pseudo' },
      roles: ['1514024774131519638'],
      nick: null,
    });

    expect(await gateway.guildMember('jeton', GUILD)).toEqual({
      discordUserId: '42',
      roles: ['1514024774131519638'],
    });
    expect(requests[0]?.url).toBe(`https://discord.test/api/v10/users/@me/guilds/${GUILD}/member`);
    expect(requests[0]?.headers.get('Authorization')).toBe('Bearer jeton');
  });

  it('rend undefined quand l’utilisateur n’est pas sur le serveur', async () => {
    const { gateway } = answering(404, { message: 'Unknown Guild', code: 10004 });

    expect(await gateway.guildMember('jeton', GUILD)).toBeUndefined();
  });

  it.each([401, 403])('refuse un jeton que Discord refuse (%i)', async (status) => {
    const { gateway } = answering(status, { message: 'refusé' });

    await expect(gateway.guildMember('jeton', GUILD)).rejects.toMatchObject({
      reason: 'forbidden',
    });
  });

  it('échoue sur une autre erreur de Discord', async () => {
    const { gateway } = answering(500);

    await expect(gateway.guildMember('jeton', GUILD)).rejects.toThrow('Discord a répondu 500.');
  });

  it('échoue sur une réponse illisible', async () => {
    const { gateway } = answering(200, { roles: 'pas une liste' });

    await expect(gateway.guildMember('jeton', GUILD)).rejects.toThrow();
  });
});
