export async function deletePlayer(guid) {
  let players = await getPlayers();
  players = players.filter((p) => p.guid !== guid);
  await writeJsonToRedis(FILE_NAME_PLAYERS, players);

  // Remove from playersQueue.json as well
  let playersQueue = await getPlayersQueue();
  playersQueue = playersQueue.filter((q) => q.guid !== guid);
  await writeJsonToRedis(FILE_NAME_PLAYERS_QUEUE, playersQueue);

  // Remove from playersGames.json as well
  let playerGames = await getPlayerGames();
  playerGames = playerGames.filter((pg) => pg.guid !== guid);
  await writeJsonToRedis(FILE_NAME_PLAYER_GAMES, playerGames);
}

export async function deletePlayerFromQueue(guid) {
  let playersQueue = await getPlayersQueue();
  playersQueue = playersQueue.filter((q) => q.guid !== guid);
  await writeJsonToRedis(FILE_NAME_PLAYERS_QUEUE, playersQueue);
  return true;
}

// Simple JSON file storage for player names
// Use Vercel Blob store instead of local fs
const FILE_NAME_PLAYERS = 'players.json';
const FILE_NAME_PLAYERS_QUEUE = 'playersQueue.json';
const FILE_NAME_PLAYER_GAMES = 'playerGames.json';

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

async function readJsonFromRedis(key, defaultValue = []) {
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

export async function getPlayers() {
  return await readJsonFromRedis(FILE_NAME_PLAYERS, []);
}

export async function getPlayersQueue() {
  return await readJsonFromRedis(FILE_NAME_PLAYERS_QUEUE, []);
}

export async function getPlayerGames() {
  return await readJsonFromRedis(FILE_NAME_PLAYER_GAMES, []);
}

export async function addPlayer(name) {
  const players = await getPlayers();
  const playersQueue = await getPlayersQueue();
  let guid;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    guid = crypto.randomUUID();
  } else {
    guid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ Math.random() * 16 >> c / 4).toString(16)
    );
  }
  const arrivedDateTime = new Date().toLocaleTimeString();
  let isPaused = false;
  players.push({ guid, name, arrivedDateTime, isPaused });
  console.log('Adding player to queue:', guid, name, arrivedDateTime, false);
  playersQueue.push({ guid}); 
  await writeJsonToRedis(FILE_NAME_PLAYERS, players);
  await writeJsonToRedis(FILE_NAME_PLAYERS_QUEUE, playersQueue);

  // Update playerGames.json
  let playerGames = await readJsonFromRedis(FILE_NAME_PLAYER_GAMES, []);
  playerGames.push({ guid, noOfGamesPlayed: 0 });
  await writeJsonToRedis(FILE_NAME_PLAYER_GAMES, playerGames);
}
