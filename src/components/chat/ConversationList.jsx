import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ConversationList({ onSelectConversation, selectedUserId }) {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.getConversations(token)
      .then(setConversations)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-4 text-gray-500">Chargement...</div>;
  if (error) return <div className="p-4 text-red-500">Erreur : {error}</div>;

  return (
    <div className="h-full overflow-y-auto">
      {conversations.length === 0 && <div className="p-4 text-gray-500 text-center">Aucune conversation</div>}
      {conversations.map((conv) => (
        <div
          key={conv.user_id}
          onClick={() => onSelectConversation(conv.user_id, conv.display_name)}
          className={`p-3 cursor-pointer hover:bg-gray-100 border-b ${selectedUserId === conv.user_id ? 'bg-blue-50' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <div className="font-medium">{conv.display_name}</div>
          </div>
          <div className="text-xs text-gray-400">@{conv.username}</div>
        </div>
      ))}
    </div>
  );
}