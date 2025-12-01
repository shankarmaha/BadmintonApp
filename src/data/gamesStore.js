import { getPlayersQueue, deletePlayerFromQueue } from '../data/playerStore';
import { promises as fs } from 'fs';

const CURRENT_SESSION_PATH = './src/data/currentSession.json';
const BADMINTON_SESSION_PATH = './src/data/badmintonSession.json';

let nextGameNumber = 1;

export async function getCurrentSession() {
  try {
    const data = await fs.readFile(CURRENT_SESSION_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getBadmintonSession() {
  try {
    const data = await fs.readFile(BADMINTON_SESSION_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { courts: [] };
  }
}

export async function updateBadmintonSession(sessionId, courtNumber, gameInProgress) {
  const badmintonSession = await getBadmintonSession();
  const court = badmintonSession.courts.find(c => c.courtNumber === courtNumber);

  if (court) {
    court.gameInProgress = gameInProgress;
    court.sessionId = sessionId;
    await fs.writeFile(BADMINTON_SESSION_PATH, JSON.stringify(badmintonSession, null, 2));
  } else {
    throw new Error(`Court number ${courtNumber} not found.`);
  }
}

export async function addPlayersToSession(sessionId) {
  const players = await getPlayersQueue();
  const PLAYER_GAMES_PATH = './src/data/playerGames.json';
  const GAME_HISTORY_PATH = './src/data/gameHistory.json';

  if (players.length === 0) {
    throw new Error("No players available to pick a game.");
  } else if (players.length < 4) {
    throw new Error("Not enough players to pick a game. At least 4 players are required.");
  }

  // Get playerGames
  let playerGames = [];
  try {
    const data = await fs.readFile(PLAYER_GAMES_PATH, 'utf-8');
    playerGames = JSON.parse(data);
  } catch {
    playerGames = [];
  }

  // Get gameHistory
  let gameHistory = [];
  try {
    const data = await fs.readFile(GAME_HISTORY_PATH, 'utf-8');
    gameHistory = JSON.parse(data);
  } catch {
    gameHistory = [];
  }

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

  // Helper to check if a player has played three consecutive games using gameNumber
  function hasPlayedThreeConsecutive(guid) {
    // Get all gameNumbers where player participated, sorted
    const numbers = gameHistory
      .filter(game => game.players.some(p => p.guid === guid) && typeof game.gameNumber === 'number')
      .map(game => game.gameNumber)
      .sort((a, b) => a - b);
    // Check for three consecutive gameNumbers ending with the last game
    if (numbers.length < 3) return false;
    for (let i = 0; i < numbers.length - 2; i++) {
      if (numbers[i + 1] === numbers[i] + 1 && numbers[i + 2] === numbers[i] + 2) {
        if (numbers[i + 2] === (gameNumber - 1)) {
          return true;
        }
      }
    }
    return false;
  }

  // Filter out players who have played three consecutive games
  const eligiblePlayers = sortedPlayers.filter(p => !hasPlayedThreeConsecutive(p.guid));

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
  await fs.writeFile(CURRENT_SESSION_PATH, JSON.stringify(currentSession, null, 2));

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