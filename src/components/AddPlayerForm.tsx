// src/components/AddPlayerForm.tsx
import React, { useState } from 'react';

export default function AddPlayerForm() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('Submitting player name:', name);
    const res = await fetch('/api/add-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    console.log('Response status:', res.status);
    if (res.status === 201) {
     console.log('Player added successfully, redirecting...');
      window.location.href = '/';
    } else if (!res.ok) {
      setError('Failed to add player');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="name"
        type="text"
        required
        placeholder="Player name"
        className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={loading}
      />
      <button
        type="submit"
        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
        disabled={loading}
      >
        {loading ? 'Adding...' : 'Add'}
      </button>
      {error && <div className="text-red-600 ml-2">{error}</div>}
    </form>
  );
}
