import { resetGameNumber } from '../../data/gamesStore.js';

export async function POST({ request }) {
  try {
    const apiUrl = new URL('/api/data.json', request.url).href;
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'gameHistory.json', value: [] })
    });
  } catch (err) {
    console.error('Error resetting game history via API:', err);
    return new Response(JSON.stringify({ error: 'Failed to reset game history' }), { status: 500 });
  }
  resetGameNumber();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
