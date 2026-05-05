import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function UserSearch({ onSelectUser }) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const users = await api.searchUsers(token, query);
      setResults(users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border-b">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          disabled={loading}
        >
          {loading ? '...' : '🔍'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {results.length > 0 && (
        <div className="mt-2 border rounded max-h-40 overflow-y-auto">
          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => onSelectUser(user.id, user.display_name)}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"
            >
              <div className="font-medium">{user.display_name}</div>
              <div className="text-xs text-gray-500">@{user.username}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}