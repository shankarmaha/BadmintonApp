import { promises as fs } from 'fs';
import { resetGameNumber } from '../../data/gamesStore.js';

const GAME_HISTORY_PATH = './src/data/gameHistory.json';

export async function POST() {
  await fs.writeFile(GAME_HISTORY_PATH, JSON.stringify([], null, 2));
  resetGameNumber();
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
