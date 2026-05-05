import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ConversationList from './components/chat/ConversationList';
import MessageList from './components/chat/MessageList';
import MessageInput from './components/chat/MessageInput';
import UserSearch from './components/chat/UserSearch';

function AppContent() {
  const { user, login, register, logout, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);


  if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 ${isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            >
              Connexion
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 ${!isLogin ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            >
              Inscription
            </button>
          </div>
          {isLogin ? <LoginForm onLogin={login} /> : <RegisterForm onRegister={register} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar conversations */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">{user.display_name}</h2>
          <button onClick={logout} className="text-sm text-red-500 mt-1">Se déconnecter</button>
        </div>
        <div className="border-t mt-2">
          <UserSearch onSelectUser={(id, name) => setSelectedUser({ id, name })} />
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            onSelectConversation={(id, name) => setSelectedUser({ id, name })}
            selectedUserId={selectedUser?.id}
          />
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-3 border-b bg-white">
              <h3 className="font-semibold">{selectedUser.name}</h3>
            </div>
            <MessageList key={refreshKey} userId={selectedUser.id} />
            <MessageInput recipientId={selectedUser.id} onMessageSent={() => setRefreshKey(prev => prev + 1)} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;