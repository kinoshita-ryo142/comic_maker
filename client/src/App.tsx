import { useEffect, useState } from 'react';
import { api } from './api/client';
import { TEXTS } from './constants/texts';
import { AdminPage } from './pages/AdminPage';
import { CharacterPage } from './pages/CharacterPage';
import { ComicStudioPage } from './pages/ComicStudioPage';
import { LoginPage } from './pages/LoginPage';
import type { Character, User } from './types';

type Tab = 'studio' | 'character' | 'admin';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('studio');

  useEffect(() => {
    async function init() {
      try {
        const { user: me } = await api.auth.me();
        setUser(me);
        const { character: char } = await api.character.get();
        setCharacter(char);
      } catch {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    void init();
  }, []);

  async function handleLogin(loggedInUser: User) {
    setUser(loggedInUser);
    try {
      const { character: char } = await api.character.get();
      setCharacter(char);
      setActiveTab(char ? 'studio' : 'character');
    } catch {
      setActiveTab('character');
    }
  }

  async function handleLogout() {
    await api.auth.logout();
    setUser(null);
    setCharacter(null);
    setActiveTab('studio');
  }

  if (checkingAuth) {
    return (
      <div className="container">
        <p className="muted">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      <header className="app-header">
        <div className="app-brand">{TEXTS.appName}</div>
        <nav className="app-nav">
          <button
            type="button"
            className={`nav-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            {TEXTS.nav.studio}
          </button>
          <button
            type="button"
            className={`nav-btn ${activeTab === 'character' ? 'active' : ''}`}
            onClick={() => setActiveTab('character')}
          >
            {TEXTS.nav.character}
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              {TEXTS.nav.admin}
            </button>
          )}
          <span className="muted" style={{ marginLeft: '0.5rem' }}>
            ID: {user.username}
          </span>
          <button type="button" className="nav-btn" onClick={handleLogout}>
            {TEXTS.nav.logout}
          </button>
        </nav>
      </header>

      <main className="container">
        {activeTab === 'studio' && (
          <ComicStudioPage
            character={character}
            onGoToCharacter={() => setActiveTab('character')}
          />
        )}
        {activeTab === 'character' && (
          <CharacterPage
            character={character}
            onSaved={(saved) => setCharacter(saved)}
          />
        )}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPage currentUser={user} />
        )}
      </main>
    </div>
  );
}

export default App;
