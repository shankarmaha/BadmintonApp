export async function deletePlayer(guid) {
  let players = await getPlayers();
  players = players.filter((p) => p.guid !== guid);
  await fs.writeFile(FILE_PATH, JSON.stringify(players, null, 2));

  // Remove from playersQueue.json as well
  let playersQueue = await getPlayersQueue();
  playersQueue = playersQueue.filter((q) => q.guid !== guid);
  await fs.writeFile(PLAYERS_QUEUE_PATH, JSON.stringify(playersQueue, null, 2));

  // Remove from playersGames.json as well
  let playerGames = await getPlayerGames();
  playerGames = playerGames.filter((pg) => pg.guid !== guid);
  await fs.writeFile(PLAYER_GAMES_PATH, JSON.stringify(playerGames, null, 2));
}

export async function deletePlayerFromQueue(guid) {
  let playersQueue = await getPlayersQueue();
  playersQueue = playersQueue.filter((q) => q.guid !== guid);
  await fs.writeFile(PLAYERS_QUEUE_PATH, JSON.stringify(playersQueue, null, 2));
  return true;
}

// Simple JSON file storage for player names
import { promises as fs } from 'fs';
const FILE_PATH = './src/data/players.json';
const PLAYERS_QUEUE_PATH = './src/data/playersQueue.json';
const PLAYER_GAMES_PATH = './src/data/playerGames.json';

export async function getPlayers() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getPlayersQueue() {
  try { 
    const data = await fs.readFile(PLAYERS_QUEUE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];  
  }
}

export async function getPlayerGames() {
  try {
    const data = await fs.readFile(PLAYER_GAMES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
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
  players.push({ guid, name, arrivedDateTime });
  playersQueue.push({ guid}); 
  await fs.writeFile(FILE_PATH, JSON.stringify(players, null, 2));
  await fs.writeFile(PLAYERS_QUEUE_PATH, JSON.stringify(playersQueue, null, 2));

  // Update playerGames.json
  const gamesFile = './src/data/playerGames.json';
  let playerGames = [];
  try {
    const gamesData = await fs.readFile(gamesFile, 'utf-8');
    playerGames = JSON.parse(gamesData);
  } catch {
    playerGames = [];
  }
  playerGames.push({ guid, noOfGamesPlayed: 0 });
  await fs.writeFile(gamesFile, JSON.stringify(playerGames, null, 2));
}
