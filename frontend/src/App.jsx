import { useEffect, useState } from 'react';
import Setup from './Setup.jsx';
import Tutorial from './Tutorial.jsx';
import Generator from './Generator.jsx';

const STORAGE_KEY = 'virada_video_user_v1';

export default function App() {
  const [view, setView] = useState('loading');
  const [user, setUser] = useState(null);
  const [tutorialName, setTutorialName] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name && parsed?.apiKey) {
          setUser(parsed);
          setView('generator');
          return;
        }
      }
    } catch {}
    setView('setup');
  }, []);

  const complete = (u) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    setView('generator');
  };

  const needTutorial = (name) => {
    setTutorialName(name);
    setView('tutorial');
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setView('setup');
  };

  if (view === 'loading') return <div className="boot" />;
  if (view === 'setup') return <Setup onComplete={complete} onNeedTutorial={needTutorial} />;
  if (view === 'tutorial') return <Tutorial name={tutorialName} onDone={() => setView('setup')} />;
  if (view === 'generator' && user) return <Generator user={user} onLogout={logout} />;
  return null;
}
