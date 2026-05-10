import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import ServiceDashboard from './ServiceDashboard';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gcare_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [lang, setLang] = useState('en');
  const [showLangSelector, setShowLangSelector] = useState(false);

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ta' : 'en');
  
  const handleLogin = (u) => {
    localStorage.setItem('gcare_user', JSON.stringify(u));
    setUser(u);
    setShowLangSelector(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('gcare_user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      {showLangSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(2, 6, 23, 0.9)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
            <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '12px' }}>
              {lang === 'en' ? 'Choose Language' : 'மொழியைத் தேர்ந்தெடுக்கவும்'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
              {lang === 'en' ? 'Please select your preferred language to continue' : 'தொடர உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                className={`glass-button ${lang === 'en' ? '' : 'outline'}`}
                onClick={() => { setLang('en'); setShowLangSelector(false); }}
                style={{ padding: '20px', fontSize: '1.2rem' }}
              >
                English
              </button>
              <button 
                className={`glass-button ${lang === 'ta' ? '' : 'outline'}`}
                onClick={() => { setLang('ta'); setShowLangSelector(false); }}
                style={{ padding: '20px', fontSize: '1.2rem' }}
              >
                தமிழ் (Tamil)
              </button>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={!user ? <Login onLogin={handleLogin} lang={lang} toggleLang={toggleLang} /> : <Navigate to={user?.role === 'admin' ? '/admin' : '/service'} />} />
        
        <Route 
          path="/admin" 
          element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} lang={lang} toggleLang={toggleLang} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/service" 
          element={user?.role === 'service_member' ? <ServiceDashboard user={user} onLogout={handleLogout} lang={lang} toggleLang={toggleLang} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
