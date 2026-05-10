import { useState } from 'react';
import { Lock, Mail, User, MapPin, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { mockLogin, mockRegister, resetPassword, googleLogin } from './mockData';
import { useEffect } from 'react';
import { translations } from './translations';

export default function Login({ onLogin, lang, toggleLang }) {
  const t = translations[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');

  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
        callback: handleGoogleResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, [isLogin, isForgot]);

  async function handleGoogleResponse(response) {
    setLoading(true);
    try {
      // Decode JWT (simplified for mock purposes)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const { email } = JSON.parse(jsonPayload);
      const { user } = await googleLogin(email);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Google Authentication Failed');
    } finally {
      setLoading(false);
    }
  }

  const VALID_LOCATIONS = [
    'aruppukkottai', 'aruppukottai', 'kariapatti', 'rajapalayam', 
    'sattur', 'sivakasi', 'srivilliputhur', 'srivilliputtur', 
    'tiruchuli', 'vembakottai', 'virudhunagar', 'watrap'
  ];

  const getGPS = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by browser");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGettingLocation(false);
      },
      (err) => {
        setError("Error getting location: " + err.message);
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgot) {
        await resetPassword(email, "", password); 
        setError(t.success_reset);
        const { user } = await mockLogin(email, password);
        setTimeout(() => {
          onLogin(user);
        }, 1500);
      } else if (isLogin) {
        const { user } = await mockLogin(email, password);
        onLogin(user);
      } else {
        const normalizedLocation = location.trim().toLowerCase();
        const isValid = VALID_LOCATIONS.some(validLoc => normalizedLocation.includes(validLoc));
        
        if (!isValid) {
          throw new Error('Not available in this location. Address must include a sub-district of Virudhunagar.');
        }

        const { user } = await mockRegister(email, password, fullName, location.trim(), lat, lng, securityAnswer);
        setError(`Registration successful! Wait for admin approval.`);
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url(/wm-bg.png) center/cover no-repeat fixed',
      position: 'relative'
    }}>
      {/* Dark overlay for better text readability against the AI image */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)' }}></div>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '8px' }}>{t.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isForgot ? t.forgot_subtitle : isLogin ? t.login_subtitle : t.register_subtitle}
          </p>
        </div>

        {error && (
          <div className="glass-panel" style={{ 
            padding: '16px', 
            marginBottom: '24px', 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderColor: error.includes('successful') || error.includes('Logging') ? 'var(--accent-green)' : 'var(--accent-red)', 
            background: 'rgba(0,0,0,0.3)',
            color: error.includes('successful') || error.includes('Logging') ? '#34d399' : '#f87171',
            fontSize: '0.95rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            {error.includes('successful') || error.includes('Logging') ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder={t.full_name} 
                  style={{ paddingLeft: '48px' }}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required 
                />
              </div>
              <div style={{ position: 'relative' }}>
                <MapPin size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text"
                  className="glass-input" 
                  placeholder={t.location}
                  style={{ paddingLeft: '48px' }}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                />
              </div>
              <button 
                type="button" 
                onClick={getGPS} 
                className="glass-button outline" 
                style={{ fontSize: '0.8rem', padding: '8px', marginBottom: '8px' }}
                disabled={gettingLocation}
              >
                {gettingLocation ? t.detecting : lat ? `📍 ${t.gps_fixed} (${lat.toFixed(2)}, ${lng.toFixed(2)})` : `🎯 ${t.detect_gps}`}
              </button>
            </>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="email" 
              className="glass-input" 
              placeholder={t.email} 
              style={{ paddingLeft: '48px' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="glass-input" 
              placeholder={isForgot ? t.new_password : t.password} 
              style={{ paddingLeft: '48px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          {(isForgot || !isLogin) && (
            <div style={{ position: 'relative' }}>
              <RefreshCw size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Security Answer (Favorite City?)" 
                style={{ paddingLeft: '48px' }}
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                required 
              />
            </div>
          )}

          <button type="submit" className="glass-button" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? t.detecting : isForgot ? t.reset_btn : isLogin ? t.sign_in_btn : t.register_btn}
          </button>

          {isLogin && !isForgot && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
              </div>
              
              <button 
                type="button" 
                className="glass-button outline" 
                style={{ width: '100%', gap: '12px', background: 'rgba(255,255,255,0.05)' }}
                onClick={async () => {
                  setLoading(true);
                  setError(lang === 'en' ? 'Connecting to Google...' : 'கூகுள் உடன் இணைக்கப்படுகிறது...');
                  try {
                    // Mock Google Login as 'dhar' (existing service member)
                    const { user } = await googleLogin('rubadharshan05@gmail.com', 'Gcare$321');
                    setTimeout(() => onLogin(user), 1000);
                  } catch (e) {
                    setError(lang === 'en' ? 'Google Login Failed' : 'கூகுள் உள்நுழைவு தோல்வியடைந்தது');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t.google_sign_in}
              </button>
              
              <div id="googleBtn" style={{ width: '100%' }}></div>
            </>
          )}
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLogin && !isForgot && (
            <button 
              type="button" 
              onClick={() => { setIsForgot(true); setError(''); }}
              style={{ background: 'transparent', color: 'var(--accent-blue)', fontSize: '0.9rem' }}
            >
              {t.forgot_link}
            </button>
          )}
          
          <button 
            type="button" 
            onClick={() => { 
              if (isForgot) {
                setIsForgot(false);
              } else {
                setIsLogin(!isLogin);
              }
              setError(''); 
            }}
            style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
          >
            {isForgot ? t.back_to_login : isLogin ? t.no_account : t.have_account}
          </button>
        </div>

        {/* Language Floating Toggle */}
        <button 
          onClick={toggleLang}
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </div>
    </div>
  );
}
