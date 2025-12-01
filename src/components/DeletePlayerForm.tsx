import React from 'react';

interface DeletePlayerFormProps {
  guid: string;
  onDeleted?: () => void;
}

export default function DeletePlayerForm({ guid, onDeleted }: DeletePlayerFormProps) {
  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/delete-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guid }),
    });
    if (onDeleted) onDeleted();
    else window.location.reload();
  }

  return (
    <form onSubmit={handleDelete} className="ml-4">
      <button
        type="submit"
        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition"
      >
        Delete
      </button>
    </form>
  );
}
