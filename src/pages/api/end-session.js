export async function POST({ request }) {
  // Reset all data via API calls
  try {
    const apiUrl = new URL('/api/data.json', request.url).href;
    await Promise.all([
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'badmintonSession.json', value: {} })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'gameHistory.json', value: [] })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'playerGames.json', value: [] })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'playersQueue.json', value: [] })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'players.json', value: [] })
      }),
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'currentSession.json', value: [] })
      })
    ]);
  } catch (err) {
    console.error('Error resetting data via API:', err);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
