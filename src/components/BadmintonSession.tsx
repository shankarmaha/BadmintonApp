import React, { useEffect, useState } from 'react';

interface Court {
  courtNumber: number;
  sessionId: string;
}

interface SessionPlayer {
  guid: string;
}

interface CurrentSession {
  sessionId: string;
  players: SessionPlayer[];
  startTime?: string;
}

interface Player {
  guid: string;
  name: string;
}

export default function BadmintonSession() {
  // Helper to format elapsed time as HH:MM:SS
  function formatElapsedTime(seconds: number) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Timer state for elapsed time
  // Deduct one hour from now for London offset if needed
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [courts, setCourts] = useState<Court[]>([]);
  const [currentSessions, setCurrentSessions] = useState<CurrentSession[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const badmintonSession = data.badmintonSession ?? { courts: [] };
        const currentSession = data.currentSession ?? [];
        const playersList = data.players ?? [];

        setCourts(badmintonSession.courts || []);
        setCurrentSessions(currentSession || []);
        setPlayers(playersList || []);
        return;
      } catch (err) {
        console.error('Failed to load data from /api/data.json:', err);
      }

      // On error, clear data
      setCourts([]);
      setCurrentSessions([]);
      setPlayers([]);
    }

    loadData();
  }, []);

  function getPlayersForCourt(sessionId: string) {
    const session = currentSessions.find(s => s.sessionId === sessionId);
    if (!session) return [];
    return session.players.map(sp => {
      const player = players.find(p => p.guid === sp.guid);
      return player ? player.name : sp.guid;
    });
  }

  function getStartTimeForCourt(sessionId: string) {
    const session = currentSessions.find(s => s.sessionId === sessionId);
    if (!session || !session.startTime) return null;
    return new Date(session.startTime);
  }

  return (
    <div>
      <div className="grid">
        {courts.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No courts in session.</div>
        ) : (
          courts.map(court => (
            <div key={court.courtNumber} className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center border border-teal-200">
              <div className="text-3xl font-extrabold text-teal-600 mb-2">Court {court.courtNumber}</div>
              <div className="w-full">
                <div className="text-center">
                  {getPlayersForCourt(court.sessionId).length === 0 ? (
                    <span className="text-gray-400">No players assigned</span>
                  ) : (
                    <span className="text-gray-800">
                      {getPlayersForCourt(court.sessionId).map((name, idx) => (
                        <span key={idx} className="inline-block mx-6">{name}</span>
                      ))}
                      {(() => {
                        const startDate = getStartTimeForCourt(court.sessionId);
                        if (!startDate) return null;
                        const elapsed = Math.floor((now - startDate.getTime()) / 1000);
                        return (
                          <span className="inline-block ml-4 text-sm text-teal-700">
                            {elapsed >= 0 ? formatElapsedTime(elapsed) : '00:00:00'}
                            <button
                              className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                              onClick={async () => {
                                await fetch(`/api/finish-session?sessionId=${court.sessionId}`, { method: 'POST' });
                                window.location.reload();
                              }}
                            >Finished</button>
                          </span>
                        );
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
