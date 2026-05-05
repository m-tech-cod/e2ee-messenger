import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { encryptMessageForRecipient } from '../../lib/crypto';

export default function MessageInput({ recipientId, onMessageSent }) {
  const { token, publicKey } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !token || !recipientId || !publicKey) return;
    setSending(true);
    try {
      const { public_key: recipientPublicKey } = await api.getUserPublicKey(token, recipientId);
      const payload = await encryptMessageForRecipient(text, recipientPublicKey, publicKey);
      await api.sendMessageOffline(token, recipientId, payload);
      setText('');
      onMessageSent?.();
    } catch (err) {
      alert("Erreur d'envoi : " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t p-3 flex gap-2 bg-white">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Écrivez votre message..."
        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={sending}
      />
      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {sending ? '...' : 'Envoyer'}
      </button>
    </div>
  );
}