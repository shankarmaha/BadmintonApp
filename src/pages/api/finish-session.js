import { promises as fs } from 'fs';

const CURRENT_SESSION_PATH = './src/data/currentSession.json';
const GAME_HISTORY_PATH = './src/data/gameHistory.json';
const PLAYERS_QUEUE_PATH = './src/data/playersQueue.json';
const BADMINTON_SESSION_PATH = './src/data/badmintonSession.json';

export async function POST({ request }) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), { status: 400 });
    }

    // Load currentSession.json
    let currentSessions = [];
    try {
        const data = await fs.readFile(CURRENT_SESSION_PATH, 'utf-8');
        currentSessions = JSON.parse(data);
    } catch {
        return new Response(JSON.stringify({ error: 'Could not read currentSession.json' }), { status: 500 });
    }

    // Find and remove the session
    const idx = currentSessions.findIndex(s => s.sessionId === sessionId);
    if (idx === -1) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }
    const finishedSession = currentSessions[idx];
    currentSessions.splice(idx, 1);
    await fs.writeFile(CURRENT_SESSION_PATH, JSON.stringify(currentSessions, null, 2));

    // Add to gameHistory.json
    let gameHistory = [];
    try {
        const data = await fs.readFile(GAME_HISTORY_PATH, 'utf-8');
        gameHistory = JSON.parse(data);
    } catch {
        gameHistory = [];
    }
    finishedSession.finishTime = new Date().toISOString();

    let gameIdGuid;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        gameIdGuid = crypto.randomUUID();
    } else {
        gameIdGuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ Math.random() * 16 >> c / 4).toString(16)
        );
    }
    finishedSession.gameId = gameIdGuid; // Add gameId to the finished session
    gameHistory.push(finishedSession);
    await fs.writeFile(GAME_HISTORY_PATH, JSON.stringify(gameHistory, null, 2));

    // Add players back to playersQueue.json
    let playersQueue = [];
    try {
        const data = await fs.readFile(PLAYERS_QUEUE_PATH, 'utf-8');
        playersQueue = JSON.parse(data);
    } catch {
        playersQueue = [];
    }
    for (const player of finishedSession.players) {
        if (!playersQueue.find(p => p.guid === player.guid)) {
            playersQueue.push({ guid: player.guid });
        }
    }
    await fs.writeFile(PLAYERS_QUEUE_PATH, JSON.stringify(playersQueue, null, 2));

    // Update badmintonSession.json
    try {
        const badmintonSessionData = await fs.readFile(BADMINTON_SESSION_PATH, 'utf-8');
        const badmintonSession = JSON.parse(badmintonSessionData);
        badmintonSession.courts.forEach(court => {
            if (court.sessionId === sessionId) {
                court.gameInProgress = false;
            }
        });
        await fs.writeFile(BADMINTON_SESSION_PATH, JSON.stringify(badmintonSession, null, 2));
    }
    catch (error) {
        console.error('Error updating badminton session:', error);
        return new Response(JSON.stringify({ error: 'Could not update badminton session' }), { status: 500 });
    }

    // Update playerGames.json for each player
    const PLAYER_GAMES_PATH = './src/data/playerGames.json';
    let playerGames = [];
    try {
        const data = await fs.readFile(PLAYER_GAMES_PATH, 'utf-8');
        playerGames = JSON.parse(data);
    } catch {
        playerGames = [];
    }
    const gameId = gameIdGuid; // Use the generated gameId
    // Update the number of games played for each player
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
    await fs.writeFile(PLAYER_GAMES_PATH, JSON.stringify(playerGames, null, 2));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
