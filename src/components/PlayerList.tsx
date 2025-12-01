import React, { useEffect, useState } from 'react';
import DeletePlayerForm from './DeletePlayerForm';




interface Player {
  guid: string;
  name: string;
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
  const [games, setGames] = useState<PlayerGame[]>([]);
  
  
  useEffect(() => {
    fetch('/src/data/playerGames.json')
      .then(res => res.json())
      .then(setGames)
      .catch(() => setGames([]));
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
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-4">No players yet.</td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.guid} className="border-t border-gray-100 hover:bg-orange-50 transition">
                  <td className="px-4 py-2 font-medium text-gray-900">{player.name}</td>
                  <td className="px-4 py-2 text-gray-600 text-sm">{player.arrivedDateTime}</td>
                  <td className="px-4 py-2 text-center">{getGamesPlayed(player)}</td>
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
