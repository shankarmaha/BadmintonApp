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
  isPaused?: boolean;
}

export default function BadmintonSession() {
  // Modal state for finishing session
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [pausedPlayers, setPausedPlayers] = useState<Set<string>>(new Set());
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
                              onClick={() => {
                                setModalSessionId(court.sessionId);
                                setModalOpen(true);
                                setPausedPlayers(new Set());
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

      {/* Modal for pausing players */}
      {modalOpen && modalSessionId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Select players to pause</h3>
            <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
              {(() => {
                // Get players for this specific session
                const session = currentSessions.find(s => s.sessionId === modalSessionId);
                const sessionPlayerGuids = session ? session.players.map(sp => sp.guid) : [];
                const sessionPlayers = players.filter(p => sessionPlayerGuids.includes(p.guid));
                
                return sessionPlayers.map(player => (
                  <label key={player.guid} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pausedPlayers.has(player.guid)}
                      onChange={(e) => {
                        const newSet = new Set(pausedPlayers);
                        if (e.target.checked) {
                          newSet.add(player.guid);
                        } else {
                          newSet.delete(player.guid);
                        }
                        setPausedPlayers(newSet);
                      }}
                      className="mr-2"
                    />
                    <span className="text-gray-700">{player.name}</span>
                  </label>
                ));
              })()}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={() => {
                  setModalOpen(false);
                  setModalSessionId(null);
                  setPausedPlayers(new Set());
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={async () => {
                  // Get session players
                  const session = currentSessions.find(s => s.sessionId === modalSessionId);
                  const sessionPlayerGuids = session ? session.players.map(sp => sp.guid) : [];
                  
                  // Update only the players in this session with isPaused status
                  const updatedPlayers = players.map(p => {
                    if (sessionPlayerGuids.includes(p.guid)) {
                      return {
                        ...p,
                        isPaused: pausedPlayers.has(p.guid)
                      };
                    }
                    return p;
                  });
                  
                  try {
                    // Update players.json via API
                    await fetch('/api/data.json', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'players.json', value: updatedPlayers })
                    });
                    
                    // Finish the session
                    await fetch(`/api/finish-session?sessionId=${modalSessionId}`, { method: 'POST' });
                    window.location.reload();
                  } catch (err) {
                    console.error('Error finishing session:', err);
                  }
                }}
              >
                Finish & Pause Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
