import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { decryptMessage } from '../../lib/crypto';

export default function MessageList({ userId }) {
  const { token, user, privateKey } = useAuth();
  const [messages, setMessages] = useState([]);
  const [decrypted, setDecrypted] = useState({});
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token || !userId) return;
    api.getMessages(token, userId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, userId]);

  useEffect(() => {
    if (!privateKey || messages.length === 0) return;
    const decryptAll = async () => {
      const map = {};
      for (const msg of messages) {
        try {
          const isOwn = msg.from_user_id === user?.id;
          map[msg.id] = await decryptMessage(msg.payload, privateKey, isOwn);
        } catch (err) {
          console.error('Decryption error:', err);
          map[msg.id] = '❌ Erreur de déchiffrement';
        }
      }
      setDecrypted(map);
    };
    decryptAll();
  }, [messages, privateKey, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, decrypted]);

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && <div className="text-center text-gray-400">Aucun message</div>}
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.from_user_id === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
            <p className="text-sm break-words">{decrypted[msg.id] || '...'}</p>
            <span className="text-xs opacity-70 mt-1 block">{new Date(msg.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}