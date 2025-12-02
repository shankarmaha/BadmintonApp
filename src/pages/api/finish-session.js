export async function POST({ request }) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });
    }

    // Fetch all data via API
    let apiData;
    try {
        const apiUrl = new URL('/api/data.json', request.url).href;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Failed to fetch API data');
        apiData = await res.json();
    } catch (err) {
        console.error('Error fetching data from API:', err);
        return new Response(JSON.stringify({ error: 'Could not fetch data from API' }), { status: 500 });
    }

    let currentSessions = apiData.currentSession ?? [];
    let gameHistory = apiData.gameHistory ?? [];
    let playersQueue = apiData.playersQueue ?? [];
    let badmintonSession = apiData.badmintonSession ?? { courts: [] };
    let playerGames = apiData.playerGames ?? [];

    // Find and remove the session
    const idx = currentSessions.findIndex(s => s.sessionId === sessionId);
    if (idx === -1) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const finishedSession = currentSessions[idx];
    currentSessions.splice(idx, 1);

    // Add to gameHistory
    finishedSession.finishTime = new Date().toISOString();

    let gameIdGuid;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        gameIdGuid = crypto.randomUUID();
    } else {
        gameIdGuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ Math.random() * 16 >> c / 4).toString(16)
        );
    }
    finishedSession.gameId = gameIdGuid;
    gameHistory.push(finishedSession);

    // Add players back to playersQueue
    for (const player of finishedSession.players) {
        if (!playersQueue.find(p => p.guid === player.guid)) {
            playersQueue.push({ guid: player.guid });
        }
    }

    // Update badmintonSession courts
    badmintonSession.courts.forEach(court => {
        if (court.sessionId === sessionId) {
            court.gameInProgress = false;
        }
    });

    // Update playerGames for each player
    const gameId = gameIdGuid;
    for (const player of finishedSession.players) {
        let pg = playerGames.find(p => p.guid === player.guid);
        if (pg) {
            pg.noOfGamesPlayed = (pg.noOfGamesPlayed || 0) + 1;
            if (!pg.gameIds) pg.gameIds = [];
            pg.gameIds.push(gameId);
        } else {
            playerGames.push({ guid: player.guid, noOfGamesPlayed: 1, gameIds: [gameId] });
        }
    }

    // Write all updated data back via API
    try {
        const apiUrl = new URL('/api/data.json', request.url).href;
        await Promise.all([
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'currentSession.json', value: currentSessions })
            }),
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'gameHistory.json', value: gameHistory })
            }),
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'playersQueue.json', value: playersQueue })
            }),
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'badmintonSession.json', value: badmintonSession })
            }),
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'playerGames.json', value: playerGames })
            })
        ]);
    } catch (err) {
        console.error('Error writing data via API:', err);
        return new Response(JSON.stringify({ error: 'Could not write data via API' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
