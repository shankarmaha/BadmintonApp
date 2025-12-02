import React, { useEffect, useState } from 'react';

interface Player {
  guid: string;
  name: string;
  arrivedDateTime: string;
}

interface PlayerGame {
  guid: string;
  noOfGamesPlayed: number;
  gameIds?: string[];
}

interface GameHistory {
  sessionId: string;
  startTime: string;
  finishTime: string;
  players: { guid: string }[];
}

export default function PlayerStats() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerGames, setPlayerGames] = useState<PlayerGame[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const pls: Player[] = data.players ?? [];
        const pg: PlayerGame[] = data.playerGames ?? [];
        const gh: GameHistory[] = data.gameHistory ?? [];

        setPlayers(pls || []);
        setPlayerGames(pg || []);
        setGameHistory(gh || []);
      } catch (e) {
        console.error('Failed to load data from /api/data.json:', e);
        setPlayers([]);
        setPlayerGames([]);
        setGameHistory([]);
      }
    }

    loadData();
  }, []);

  function getCourtTime(guid: string) {
    // Sum all durations for this player in gameHistory
    let totalMs = 0;
    gameHistory.forEach(game => {
      if (game.players.some(p => p.guid === guid)) {
        const start = new Date(game.startTime).getTime();
        const end = new Date(game.finishTime).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          totalMs += end - start;
        }
      }
    });
    const totalSec = Math.floor(totalMs / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function getDidNotPlayWith(guid: string): string[] {
    // Get all other player guids
    const otherPlayers = players.filter(p => p.guid !== guid);
    // Find all games this player played
    const gamesPlayed = gameHistory.filter(game => game.players.some(p => p.guid === guid));
    // Collect all guids this player has played with
    const playedWith = new Set<string>();
    gamesPlayed.forEach(game => {
      game.players.forEach(p => {
        if (p.guid !== guid) playedWith.add(p.guid);
      });
    });
    // Return names of players not played with
    return otherPlayers.filter(p => !playedWith.has(p.guid)).map(p => p.name);
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-8 flex justify-end">
        <a href="/" className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition">Home</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {players.map(player => {
          const stats = playerGames.find(pg => pg.guid === player.guid);
          const didntPlayWith = getDidNotPlayWith(player.guid);
          return (
            <div key={player.guid} className="border border-teal-200 rounded-lg p-6 flex flex-col items-center bg-gray-50 hover:shadow-xl transition">
              <div className="text-xl font-bold text-teal-700 mb-2">{player.name}</div>
              <div className="text-sm text-gray-500 mb-2">Arrived: {player.arrivedDateTime}</div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Games Played: {stats?.noOfGamesPlayed ?? 0}</div>
              <div className="text-lg font-semibold text-gray-800 mb-2">Court Time: {getCourtTime(player.guid)}</div>
              <div className="text-md text-red-600 mt-2">Didn't play with: {didntPlayWith.length > 0 ? didntPlayWith.join(', ') : 'None'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
