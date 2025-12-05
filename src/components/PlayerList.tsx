import React, { useEffect, useState } from 'react';
import DeletePlayerForm from './DeletePlayerForm';




interface Player {
  guid: string;
  name: string;
  isPaused?: boolean;
  arrivedDateTime?: string;
}


interface PlayerGame {
  guid: string;
  noOfGamesPlayed: number;
}

interface PlayerListProps {
  players: Player[];  
}




export default function PlayerList({players}: PlayerListProps) {
  const [localPlayers, setLocalPlayers] = useState<Player[]>(players || []);
  useEffect(() => {
    // Start with the queued players passed from the parent
    setLocalPlayers(players || []);

    // Fetch current player records to get up-to-date `isPaused` values
    // and merge those statuses into the queued players for button state.
    async function mergePausedStatuses() {
      try {
        const res = await fetch('/api/data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const allPlayers = data.players ?? [];
        const merged = (players || []).map(p => {
          const found = allPlayers.find((ap: any) => ap.guid === p.guid);
          return { ...p, isPaused: found && typeof found.isPaused !== 'undefined' ? found.isPaused : p.isPaused };
        });
        setLocalPlayers(merged);
      } catch (err) {
        console.error('Failed to merge isPaused statuses from /api/data.json:', err);
      }
    }

    mergePausedStatuses();
  }, [players]);
  const [games, setGames] = useState<PlayerGame[]>([]);
  
  useEffect(() => {
    async function loadPlayerGames() {
      try {
        const res = await fetch('/api/data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const playerGames = data.playerGames ?? [];
        setGames(playerGames);
      } catch (err) {
        console.error('Failed to load playerGames from /api/data.json:', err);
        setGames([]);
      }
    }

    loadPlayerGames();
  }, []);

  function getGamesPlayed(player: Player) {
    // If noOfGamesPlayed is present on the player prop, use it; otherwise fallback to playerGames.json
    if (typeof (player as any).noOfGamesPlayed === 'number') {
      return (player as any).noOfGamesPlayed;
    }
    const found = games.find(g => g.guid === player.guid);
    return found ? found.noOfGamesPlayed : 0;
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Players</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow border border-gray-200">
          <thead>
            <tr className="bg-orange-100">
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Arrived Time</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Games</th>
              <th className='px-4 py-2 text-left font-semibold text-gray-700'>Paused</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-4">No players yet.</td>
              </tr>
            ) : (
              localPlayers.map((player) => (
                <tr key={player.guid} className="border-t border-gray-100 hover:bg-orange-50 transition">
                  <td className="px-4 py-2 font-medium text-gray-900">{player.name}</td>
                  <td className="px-4 py-2 text-gray-600 text-sm">{player.arrivedDateTime}</td>
                  <td className="px-4 py-2 text-center">{getGamesPlayed(player)}</td>
                  <td className="px-4 py-2 text-center">
                    {player.isPaused ? (
                      <button
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={async () => {
                          const updated = localPlayers.map(p => p.guid === player.guid ? { ...p, isPaused: false } : p);
                          setLocalPlayers(updated);
                          try {
                            await fetch('/api/data.json', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'players.json', patch: { guid: player.guid, field: 'isPaused', value: false } })
                            });
                          } catch (err) {
                            console.error('Failed to update isPaused:', err);
                            setLocalPlayers(players || []);
                          }
                        }}
                      >
                        Play
                      </button>
                    ) : (
                      <button
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        onClick={async () => {
                          const updated = localPlayers.map(p => p.guid === player.guid ? { ...p, isPaused: true } : p);
                          setLocalPlayers(updated);
                          try {
                            await fetch('/api/data.json', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ key: 'players.json', patch: { guid: player.guid, field: 'isPaused', value: true } })
                            });
                          } catch (err) {
                            console.error('Failed to update isPaused:', err);
                            setLocalPlayers(players || []);
                          }
                        }}
                      >
                        Pause
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right"><DeletePlayerForm guid={player.guid} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
