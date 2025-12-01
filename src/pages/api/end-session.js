import { promises as fs } from 'fs';

const BADMINTON_SESSION_PATH = './src/data/badmintonSession.json';
const GAME_HISTORY_PATH = './src/data/gameHistory.json';
const PLAYERS_GAMES_PATH = './src/data/playerGames.json';
const PLAYERS_QUEUE_PATH = './src/data/playersQueue.json';
const PLAYERS_PATH = './src/data/players.json';

export async function POST() {
  await fs.writeFile(BADMINTON_SESSION_PATH, JSON.stringify({}, null, 2));
  await fs.writeFile(GAME_HISTORY_PATH, JSON.stringify([], null, 2));
  await fs.writeFile(PLAYERS_GAMES_PATH, JSON.stringify([], null, 2));
  await fs.writeFile(PLAYERS_QUEUE_PATH, JSON.stringify([], null, 2));
  await fs.writeFile(PLAYERS_PATH, JSON.stringify([], null, 2));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
