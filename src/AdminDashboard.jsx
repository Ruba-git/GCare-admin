import { useState, useEffect } from 'react';
import { LogOut, Users, Settings, Activity, CheckCircle, XCircle, Bell, Navigation } from 'lucide-react';
import { getServiceMembers, getAllServiceRequests, updateServiceMemberStatus, subscribeToNewRequests, calculateDistance, triggerNewRequestMock } from './mockData';
import { translations } from './translations';

export default function AdminDashboard({ user, onLogout, lang, toggleLang }) {
  const t = translations[lang];
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [nearbyAlert, setNearbyAlert] = useState(null);
  const hornAudio = new Audio('https://www.soundjay.com/transportation/sounds/ship-horn-1.mp3');

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToNewRequests((newReq) => {
      setRequests(prev => [newReq, ...prev]);
      
      // Proximity Alert Logic
      getServiceMembers().then(allMembers => {
        const approvedMembers = allMembers.filter(m => m.status === 'approved');
        const nearbyMember = approvedMembers.find(m => {
          if (!m.latitude || !m.longitude || !newReq.lat || !newReq.lng) return false;
          const dist = calculateDistance(m.latitude, m.longitude, newReq.lat, newReq.lng);
          return dist <= 10; // 10km radius
        });

        if (nearbyMember) {
          setNearbyAlert({ member: nearbyMember, request: newReq });
          hornAudio.play().catch(e => console.log("Audio play blocked:", e));
          // Clear alert after 8 seconds
          setTimeout(() => setNearbyAlert(null), 8000);
        }
      });
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    const [m, r] = await Promise.all([getServiceMembers(), getAllServiceRequests()]);
    setMembers(m);
    setRequests(r);
  };

  const handleStatusUpdate = async (id, status) => {
    await updateServiceMemberStatus(id, status);
    loadData();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'url(/ac-bg.png) center/cover no-repeat fixed',
      position: 'relative'
    }}>
      {/* Dark overlay for better readability */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(8px)', zIndex: 0 }}></div>
      
      {/* Proximity Alert Banner */}
      {nearbyAlert && (
        <div className="alert-pulse" style={{ 
          position: 'fixed', 
          top: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 1000,
          background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
          padding: '20px 40px',
          borderRadius: '12px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.6)'
        }}>
          <div style={{ background: 'white', borderRadius: '50%', padding: '10px' }}>
            <Bell size={32} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{t.nearby_alert}</h2>
            <p style={{ margin: 0, opacity: 0.9 }}>
              <strong>{nearbyAlert.member.fullName}</strong> {lang === 'en' ? 'is near' : 'அருகில் இருக்கிறார்'} <strong>{nearbyAlert.request.location}</strong>
            </p>
          </div>
          <button onClick={() => setNearbyAlert(null)} style={{ background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '4px', padding: '4px 12px' }}>{t.dismiss}</button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
      <header className="glass-panel" style={{ margin: '20px', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent-blue)', padding: '8px', borderRadius: '8px' }}>
            <Settings size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{t.admin_portal}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.welcome}, {user.fullName}</span>
          </div>
        </div>
        <button className="glass-button outline" onClick={onLogout} style={{ padding: '8px 16px' }}>
          <LogOut size={18} /> {t.logout}
        </button>
      </header>

      {/* Main Content */}
      <main className="container" style={{ flex: 1, display: 'flex', gap: '24px', paddingBottom: '40px' }}>
        
        {/* Sidebar */}
        <div className="glass-panel" style={{ width: '250px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', height: 'fit-content' }}>
          <button 
            className={`glass-button ${activeTab === 'overview' ? '' : 'outline'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} /> {t.overview}
          </button>
          <button 
            className={`glass-button ${activeTab === 'members' ? '' : 'outline'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('members')}
          >
            <Users size={18} /> {t.members}
          </button>
          <button 
            className={`glass-button ${activeTab === 'requests' ? '' : 'outline'}`} 
            style={{ justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('requests')}
          >
            <Settings size={18} /> {t.requests}
          </button>
          
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button 
              className="glass-button outline" 
              style={{ width: '100%', fontSize: '0.8rem', borderStyle: 'dashed' }}
              onClick={() => triggerNewRequestMock({
                customerName: 'Test Customer',
                customerPhone: '555-9999',
                applianceType: 'washing machine',
                location: 'Nearby Street',
                description: 'Test emergency booking',
                lat: 9.5870, // Very close to the mock member in db.json (9.5855)
                lng: 77.9610
              })}
            >
              <Navigation size={14} /> {t.test_alert}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ flex: 1, padding: '32px' }}>
          
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Dashboard Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.total_requests}</p>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-blue)' }}>{requests.length}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(139, 92, 246, 0.1)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.active_members}</p>
                  <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-purple)' }}>{members.filter(m => m.status === 'approved').length}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.pending_approvals}</p>
                  <h2 style={{ fontSize: '2.5rem', color: '#fbbf24' }}>{members.filter(m => m.status === 'pending').length}</h2>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Service Member Management</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {members.map(m => (
                  <div key={m.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{m.fullName}</h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span>{m.email}</span>
                        <span>•</span>
                        <span>Location: {m.serviceLocation}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={`badge ${m.status}`}>{m.status}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {m.status !== 'approved' && (
                          <button onClick={() => handleStatusUpdate(m.id, 'approved')} className="glass-button success" style={{ padding: '8px 12px' }} title="Approve">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {m.status !== 'rejected' && (
                          <button onClick={() => handleStatusUpdate(m.id, 'rejected')} className="glass-button danger" style={{ padding: '8px 12px' }} title={m.status === 'approved' ? "Revoke Access" : "Reject"}>
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {members.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No service members found.</p>}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Global Service Requests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map(req => (
                  <div key={req.id} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{req.applianceType} Repair</h4>
                      <span className={`badge ${req.status}`}>{req.status}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{req.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>Customer: {req.customerName}</span>
                      <span>Location: {req.location}</span>
                      <span>Phone: {req.customerPhone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
      </main>
    </div>
  </div>
  );
}
