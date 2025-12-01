import React, { useEffect, useState } from 'react';

interface Player {
  guid: string;
  name: string;
}

interface GameHistory {
  sessionId: string;
  startTime: string;
  finishTime: string;
  players: { guid: string }[];
  gameNumber?: number;
  courtNumber?: number;
}

export default function GameStats() {
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [badmintonSession, setBadmintonSession] = useState<{ courts: { courtNumber: number; sessionId: string }[] }>({ courts: [] });

  useEffect(() => {
    Promise.all([
      fetch('/src/data/gameHistory.json').then(res => res.json()),
      fetch('/src/data/players.json').then(res => res.json()),
      fetch('/src/data/badmintonSession.json').then(res => res.json()),
    ]).then(([gameHistory, players, badmintonSession]) => {
      setGameHistory(gameHistory || []);
      setPlayers(players || []);
      setBadmintonSession(badmintonSession || { courts: [] });
    });
  }, []);

  function getPlayerNames(guids: { guid: string }[]) {
    return guids.map(p => {
      const player = players.find(pl => pl.guid === p.guid);
      return player ? player.name : p.guid;
    }).join(', ');
  }

  function formatTime(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function getDuration(start: string, end: string) {
    if (!start || !end) return '';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return '';
    const totalSec = Math.floor((e - s) / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const sec = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  function getCourtNumber(sessionId: string) {
    const court = badmintonSession.courts.find(c => c.sessionId === sessionId);
    return court ? court.courtNumber : '-';
  }

  const sortedGameHistory = [...gameHistory].sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0));

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-8 flex justify-end">
        <a href="/" className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition">Home</a>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-indigo-200 rounded-lg bg-gradient-to-r from-pink-50 via-teal-50 to-indigo-50">
          <thead>
            <tr className="bg-indigo-100">
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">Game #</th>
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">Court</th>
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">Players</th>
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">Start Time</th>
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">End Time</th>
              <th className="px-4 py-2 text-left text-indigo-700 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sortedGameHistory.map((game, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50'}>
                <td className="px-4 py-2 font-bold text-indigo-600">{game.gameNumber ?? idx + 1}</td>
                <td className="px-4 py-2">{getCourtNumber(game.sessionId)}</td>
                <td className="px-4 py-2 text-teal-700">{getPlayerNames(game.players)}</td>
                <td className="px-4 py-2">{formatTime(game.startTime)}</td>
                <td className="px-4 py-2">{formatTime(game.finishTime)}</td>
                <td className="px-4 py-2 text-pink-700 font-semibold">{getDuration(game.startTime, game.finishTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
