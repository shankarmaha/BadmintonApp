import type { APIRoute } from 'astro';
import { addPlayer, getPlayers } from '../../data/playerStore.js';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const name = data ? data.name : '';
  if (name) {
    await addPlayer(name);
    // Get the last added player (with guid)
    const players = await getPlayers();
    const player = players[players.length - 1];
    return new Response(JSON.stringify(player), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response('Player name required', { status: 400 });
};
