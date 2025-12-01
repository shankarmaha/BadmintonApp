import type { APIRoute } from 'astro';
import { pickGame } from '../../data/gamesStore.js';

export const POST: APIRoute = async ({ }) => {
    await pickGame();

    return new Response(JSON.stringify("{}"), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
    });
}