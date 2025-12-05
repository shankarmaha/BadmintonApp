import type { APIRoute } from 'astro';

const REDIS_URL = 'redis://default:BhTmCNTYNczSkuH3PGwYcF0T11Ng4cah@redis-17112.c338.eu-west-2-1.ec2.cloud.redislabs.com:17112';

async function getRedisClient() {
  const { createClient } = await import('redis');
  const client = createClient({ url: REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  return client;
}

// Normalize Redis GET results which may be `string | Buffer` to a string
function toStringOrNull(v: string | Buffer | null): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  // Buffer-like
  try {
    // Buffer.isBuffer may not exist in some runtimes, but Node provides it
    // Use (v as any).toString() as a fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf: any = v;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(buf)) {
      return buf.toString('utf8');
    }
    if (typeof buf.toString === 'function') return buf.toString();
    return String(buf);
  } catch (e) {
    return String(v as any);
  }
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const client = await getRedisClient();
    
    let players = [];
    let playersQueue = [];
    let playerGames = [];
    let gameHistory = [];
    let badmintonSession = { courts: [] };
    let currentSession = [];
    try {
      const txt = await client.get('players.json');
      players = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
    } catch (e) {
      console.warn('Error reading players.json:', e);
    }
    
    try {
      const txt = await client.get('playersQueue.json');
      playersQueue = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
    } catch (e) {
      console.warn('Error reading playersQueue.json:', e);
    }

    try {
      const txt = await client.get('playerGames.json');
      playerGames = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
    } catch (e) {
      console.warn('Error reading playerGames.json:', e);
    }

    try {
      const txt = await client.get('gameHistory.json');
      gameHistory = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
    } catch (e) {
      console.warn('Error readisdng gameHistory.json:', e);
    }

    try {
      const txt = await client.get('badmintonSession.json');
      badmintonSession = txt ? JSON.parse(toStringOrNull(txt) as string) : { courts: [] };
    } catch (e) {
      console.warn('Error reading badmintonSession.json:', e);
    }

    try {
      const txt = await client.get('currentSession.json');
      currentSession = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
    } catch (e) {
      console.warn('Error reading currentSession.json:', e);
    }

    return new Response(JSON.stringify({ players, playersQueue, playerGames, gameHistory, badmintonSession, currentSession }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('API /api/data.json error', err);
    return new Response(JSON.stringify({ error: 'Failed to read data' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  // Allow writing individual keys if needed: body { key, value }
  try {
    const body = await request.json();
    console.log('POST /api/data.json body:', body);
    if (!body || !body.key) return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400 });
    const { createClient } = await import('redis');
    const client = createClient({ url: REDIS_URL });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();

    // Support a lightweight patch operation for players.json
    if (body.patch && body.key === 'players.json') {
      try {
        const txt = await client.get('players.json');
        const players = txt ? JSON.parse(toStringOrNull(txt) as string) : [];
        const { guid, field, value } = body.patch;
        const updated = (players || []).map((p: any) => p.guid === guid ? { ...p, [field]: value } : p);
        await client.set('players.json', JSON.stringify(updated));
        await client.disconnect();
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      } catch (e) {
        console.error('Failed to apply patch to players.json', e);
        await client.disconnect();
        return new Response(JSON.stringify({ error: 'Failed to apply patch' }), { status: 500 });
      }
    }

    // Default: overwrite the key with provided value
    await client.set(body.key, JSON.stringify(body.value));
    await client.disconnect();
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('API /api/data.json POST error', err);
    return new Response(JSON.stringify({ error: 'Failed to write data' }), { status: 500 });
  }
};
