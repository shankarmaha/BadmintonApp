import { getPlayersQueue, deletePlayerFromQueue } from '../data/playerStore';

// Blob filenames
const FILE_NAME_CURRENT_SESSION = 'currentSession.json';
const FILE_NAME_BADMINTON_SESSION = 'badmintonSession.json';
const FILE_NAME_PLAYER_GAMES = 'playerGames.json';
const FILE_NAME_GAME_HISTORY = 'gameHistory.json';

// Redis-based storage helpers
let _redisClient = null;
const REDIS_URL = process.env.REDIS_URL ?? import.meta.env.REDIS_URL ?? 'redis://default:BhTmCNTYNczSkuH3PGwYcF0T11Ng4cah@redis-17112.c338.eu-west-2-1.ec2.cloud.redislabs.com:17112';

async function getRedisClient() {
  if (_redisClient) return _redisClient;
  const { createClient } = await import('redis');
  const client = createClient({ url: REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  _redisClient = client;
  return _redisClient;
}

async function readJsonFromRedis(key, defaultValue) {
  try {
    const client = await getRedisClient();
    const txt = await client.get(key);
    if (!txt) return defaultValue;
    return JSON.parse(txt);
  } catch (e) {
    console.error('readJsonFromRedis error', e);
    return defaultValue;
  }
}

async function writeJsonToRedis(key, obj) {
  const client = await getRedisClient();
  await client.set(key, JSON.stringify(obj, null, 2));
}

let nextGameNumber = 1;

export async function getCurrentSession() {
  return await readJsonFromRedis(FILE_NAME_CURRENT_SESSION, []);
}

export async function getBadmintonSession() {
  return await readJsonFromRedis(FILE_NAME_BADMINTON_SESSION, { courts: [] });
}

export async function updateBadmintonSession(sessionId, courtNumber, gameInProgress) {
  const badmintonSession = await getBadmintonSession();
  const court = badmintonSession.courts.find(c => c.courtNumber === courtNumber);

  if (court) {
    court.gameInProgress = gameInProgress;
    court.sessionId = sessionId;
    await writeJsonToRedis(FILE_NAME_BADMINTON_SESSION, badmintonSession);
  } else {
    throw new Error(`Court number ${courtNumber} not found.`);
  }
}

export async function addPlayersToSession(sessionId) {
  const playersQueue = await getPlayersQueue();
  
  // Get full player data to check isPaused status
  const allPlayers = await readJsonFromRedis('players.json', []);
  
  // Filter out paused players from the queue
  const players = playersQueue.filter(queuePlayer => {
    const fullPlayer = allPlayers.find(p => p.guid === queuePlayer.guid);
    return !fullPlayer?.isPaused;
  });

  if (players.length === 0) {
    throw new Error("No available players to pick a game.");
  } else if (players.length < 4) {
    throw new Error("Not enough available players to pick a game. At least 4 players are required.");
  }

  // Get playerGames
  let playerGames = [];
  playerGames = await readJsonFromRedis(FILE_NAME_PLAYER_GAMES, []);

  // Get gameHistory
  let gameHistory = [];
  gameHistory = await readJsonFromRedis(FILE_NAME_GAME_HISTORY, []);

  // Use static variable for gameNumber
  const gameNumber = nextGameNumber++;
  console.log(`Next game number: ${gameNumber}`);

  // Sort players by least games played
  const sortedPlayers = [...players].sort((a, b) => {
    const pa = playerGames.find(pg => pg.guid === a.guid);
    const pb = playerGames.find(pg => pg.guid === b.guid);
    return (pa?.noOfGamesPlayed || 0) - (pb?.noOfGamesPlayed || 0);
  });

  // Helper to check if a group of 4 has played together
  function groupPlayedTogether(group) {
    const groupGuids = group.map(p => p.guid).sort();
    return gameHistory.some(g => {
      if (!g.players || g.players.length !== 4) return false;
      const guids = g.players.map(p => p.guid).sort();
      return JSON.stringify(guids) === JSON.stringify(groupGuids);
    });
  }

  // Helper to check if a player has played two consecutive games using gameNumber
  function hasPlayedTwoConsecutive(guid) {
    // Get all gameNumbers where player participated, sorted
    const numbers = gameHistory
      .filter(game => game.players.some(p => p.guid === guid) && typeof game.gameNumber === 'number')
      .map(game => game.gameNumber)
      .sort((a, b) => a - b);
    // Check for two consecutive gameNumbers ending with the last game
    if (numbers.length < 2) return false;
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === numbers[i] + 1) {
        if (numbers[i + 1] === (gameNumber - 1)) {
          return true;
        }
      }
    }
    return false;
  }

  // Filter out players who have played two consecutive games
  const eligiblePlayers = sortedPlayers.filter(p => !hasPlayedTwoConsecutive(p.guid));

  let shuffledPlayers = null;
  // Try to find a group of 4 eligible players who have not played together
  for (let i = 0; i < eligiblePlayers.length; i++) {
    for (let j = i + 1; j < eligiblePlayers.length; j++) {
      for (let k = j + 1; k < eligiblePlayers.length; k++) {
        for (let l = k + 1; l < eligiblePlayers.length; l++) {
          const group = [eligiblePlayers[i], eligiblePlayers[j], eligiblePlayers[k], eligiblePlayers[l]];
          if (!groupPlayedTogether(group)) {
            shuffledPlayers = group;
            break;
          }
        }
        if (shuffledPlayers) break;
      }
      if (shuffledPlayers) break;
    }
    if (shuffledPlayers) break;
  }
  // If all groups have played together, pick the first 4 eligible with least games played
  if (!shuffledPlayers && eligiblePlayers.length >= 4) {
    shuffledPlayers = eligiblePlayers.slice(0, 4);
  }
  // If not enough eligible players, fall back to original logic
  if (!shuffledPlayers) {
    shuffledPlayers = sortedPlayers.slice(0, 4);
  }

  const sesstionStartTime = new Date().toISOString();
  const currentSession = await getCurrentSession();
  currentSession.push({ sessionId: sessionId, startTime: sesstionStartTime, players: shuffledPlayers, gameNumber });
  await writeJsonToRedis(FILE_NAME_CURRENT_SESSION, currentSession);

  for (const player of shuffledPlayers) {
    await deletePlayerFromQueue(player.guid);
  }

  return shuffledPlayers;
}



export async function pickGame() {
  const badmintonSession = await getBadmintonSession();
  let players;

  if (badmintonSession.courts != null) {
    for (const court of badmintonSession.courts) {
      if (!court.gameInProgress) {
        console.log(`Picking game for court ${court.courtNumber}`);
        try {
          players = await addPlayersToSession(court.sessionId);
          await updateBadmintonSession(court.sessionId, court.courtNumber, true);
          console.log(`Game started on court ${court.courtNumber} with session ID ${court.sessionId}`);
        } catch (error) {
          console.error(`Error picking game for court ${court.courtNumber}: ${error.message}`);
        }
      }
    }
  }
  else{
    console.log("No courts available in badminton session.");
  }



  return players

}

export function resetGameNumber() {
  nextGameNumber = 1;
}