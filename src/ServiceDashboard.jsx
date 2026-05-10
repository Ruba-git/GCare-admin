import { useState, useEffect, useRef } from 'react';
import { LogOut, MapPin, Bell, CheckCircle, Wrench, Package, Navigation, AlertCircle } from 'lucide-react';
import { getJobsByLocation, subscribeToNewRequests, triggerNewRequestMock } from './mockData';
import { translations } from './translations';

export default function ServiceDashboard({ user, onLogout, lang, toggleLang }) {
  const t = translations[lang];
  const [jobs, setJobs] = useState([]);
  const [alertJob, setAlertJob] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ earnings: 1250, jobsToday: 3, rating: 4.8 });
  const [loadError, setLoadError] = useState(null);
  
  // Safety check for user data
  if (!user) return <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Loading session...</div>;
  
  const userLoc = user.serviceLocation || '';
  const userFull = user.fullName || 'Member';

  const audioContextRef = useRef(null);

  useEffect(() => {
    loadJobs();
    
    // Initialize AudioContext on first user interaction to bypass browser autoplay policies
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio, { once: true });

    // Request GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setGpsError('GPS access denied. Falling back to string matching.');
        }
      );
    }

    const unsubscribe = subscribeToNewRequests((newReq) => {
      // Check if job matches user's location via GPS (within 15km) or fallback to text match
      let isNearby = false;
      if (userCoords && newReq.coords) {
        const distance = calculateDistance(userCoords.lat, userCoords.lng, newReq.coords.lat, newReq.coords.lng);
        if (distance <= 15) isNearby = true;
      } else if (newReq.location && userLoc && newReq.location.toLowerCase() === userLoc.toLowerCase()) {
        isNearby = true;
      }

      if (isNearby && isOnline) {
        setJobs(prev => [newReq, ...prev]);
        triggerDoubleAlert(newReq);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('click', initAudio);
    };
  }, [user.serviceLocation]);

  const loadJobs = async () => {
    try {
      if (!userLoc) return;
      const locJobs = await getJobsByLocation(userLoc);
      setJobs(locJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setLoadError("Could not connect to database. Please check Supabase credentials.");
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  const playBeep = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const triggerDoubleAlert = (job) => {
    setAlertJob(job);
    playBeep();
    
    // Play sound 3 times for emphasis
    setTimeout(playBeep, 400);
    setTimeout(playBeep, 800);

    // Auto-dismiss alert visual after 10 seconds
    setTimeout(() => {
      setAlertJob(null);
    }, 10000);
  };

  const simulateNewJob = () => {
    const types = ['ac', 'fridge', 'washing_machine'];
    
    // Simulate coordinates near the user (if GPS is active) or use a dummy coordinate
    const simLat = userCoords ? userCoords.lat + (Math.random() * 0.05 - 0.025) : 9.58;
    const simLng = userCoords ? userCoords.lng + (Math.random() * 0.05 - 0.025) : 77.95;

    triggerNewRequestMock({
      customerName: 'Test User (GPS Nearby)',
      customerPhone: '555-9999',
      applianceType: types[Math.floor(Math.random() * types.length)],
      location: userLoc,
      coords: { lat: simLat, lng: simLng },
      description: 'Simulated new job for testing GPS alert system'
    });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'url(/fridge-bg.png) center/cover no-repeat fixed',
      position: 'relative'
    }}>
      {/* Dark overlay for better readability */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(8px)', zIndex: 0 }}></div>
      
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Rapido-Style Status Bar */}
        <div style={{ 
          background: isOnline ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)', 
          padding: '12px', 
          textAlign: 'center', 
          fontWeight: 'bold', 
          color: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <span>{isOnline ? (lang === 'en' ? 'ONLINE' : 'ஆன்லைன்') : (lang === 'en' ? 'OFFLINE' : 'ஆஃப்லைன்')}</span>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            style={{
              width: '50px',
              height: '24px',
              borderRadius: '12px',
              background: 'white',
              position: 'relative',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#ef4444',
              position: 'absolute',
              top: '2px',
              left: isOnline ? '28px' : '2px',
              transition: 'all 0.2s ease'
            }}></div>
          </button>
        </div>

        {/* Header with Stats */}
        <header className="glass-panel" style={{ margin: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {userFull.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{userFull}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Captain' : 'கேப்டன்'} • {userLoc}</span>
              </div>
            </div>
            <button onClick={onLogout} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
              <LogOut size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Earnings' : 'வருவாய்'}</p>
              <h4 style={{ margin: 0, color: 'var(--accent-green)' }}>₹{stats.earnings}</h4>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.jobsToday || (lang === 'en' ? 'Jobs' : 'பணிகள்')}</p>
              <h4 style={{ margin: 0 }}>{stats.jobsToday}</h4>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Rating' : 'மதிப்பீடு'}</p>
              <h4 style={{ margin: 0, color: '#fbbf24' }}>★ {stats.rating}</h4>
            </div>
          </div>
        </header>

        {/* New Job Alert Overlay (Rapido Style) */}
        {alertJob && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            zIndex: 1000,
            animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div className="glass-panel" style={{ padding: '24px', background: 'rgba(2, 6, 23, 0.95)', border: '2px solid var(--accent-blue)', boxShadow: '0 -10px 40px rgba(59, 130, 246, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>NEW REQUEST</span>
                  <h3 style={{ margin: '8px 0 4px', textTransform: 'capitalize' }}>{alertJob.applianceType} Repair</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{alertJob.location}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, color: 'var(--accent-green)' }}>₹450</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est. Earnings</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="glass-button outline" style={{ flex: 1 }} onClick={() => setAlertJob(null)}>Pass</button>
                <button className="glass-button" style={{ flex: 2, background: 'var(--accent-green)' }} onClick={() => { setJobs([alertJob, ...jobs]); setAlertJob(null); }}>Accept Job</button>
              </div>
            </div>
          </div>
        )}

        {/* Active Jobs List */}
        <main style={{ padding: '0 16px 100px' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{lang === 'en' ? 'AVAILABLE ORDERS' : 'கிடைக்கக்கூடிய ஆர்டர்கள்'}</h4>
          
          {loadError && (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}>
              <AlertCircle size={20} style={{ marginBottom: '8px' }} />
              <p>{loadError}</p>
              <button className="glass-button outline" onClick={loadJobs} style={{ marginTop: '12px' }}>Retry Connection</button>
            </div>
          )}

          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
              <Package size={64} style={{ margin: '0 auto 16px' }} />
              <p>{isOnline ? 'Waiting for new orders nearby...' : 'Go online to see orders'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {jobs.map(job => (
                <div key={job.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{job.applianceType} Repair</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₹450</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    <MapPin size={14} />
                    <span>{job.location}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="glass-button outline" style={{ flex: 1, padding: '10px' }}>Details</button>
                    <button className="glass-button" style={{ flex: 1, padding: '10px' }}>
                      <Navigation size={16} /> Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        
        {/* Floating Debug Tool (Simulate Ride) */}
        <button 
          onClick={simulateNewJob}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-purple)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
            zIndex: 100
          }}
        >
          <Bell size={28} />
        </button>
      </div>
    </div>
  );
}
