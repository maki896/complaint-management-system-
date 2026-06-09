import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  PlusCircle, 
  User as UserIcon, 
  Lock, 
  MapPin, 
  Upload, 
  Briefcase, 
  Users, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Building,
  Activity,
  Send,
  MessageSquare
} from 'lucide-react';

const BACKEND_URL = `http://${window.location.hostname || '127.0.0.1'}:5000`;
const API_BASE = `${BACKEND_URL}/api`;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'login', 'register', 'submit-complaint', 'dashboard'
  const [activeTab, setActiveTab] = useState('overview'); // dashboard sidebar tab
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  
  // Save auth state to local storage
  const handleLoginState = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setCurrentPage('dashboard');
    setAuthError('');
    setAuthSuccess('');
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('home');
  };

  return (
    <div className="app-container">
      {/* 1. Header */}
      <header className="glass-header">
        <div className="logo-container" onClick={() => setCurrentPage('home')}>
          <div className="logo-icon-wrap">
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <h1 className="logo-text-large">OSTA-CMS</h1>
            <p className="logo-sub">Complaint Management System</p>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link-btn ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => { setCurrentPage('home'); setTrackedComplaint(null); }}
          >
            Track Complaint
          </button>

          {user ? (
            <>
              <button
                className={`nav-link-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                Dashboard
              </button>
              {(user.role === 'citizen' || user.role === 'staff') && (
                <button
                  className="nav-link-btn nav-link-primary"
                  onClick={() => setCurrentPage('submit-complaint')}
                >
                  <PlusCircle size={15} /> File Complaint
                </button>
              )}
              <button className="nav-link-btn" onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:'0.4rem', color: '#f87171' }}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-link-btn ${currentPage === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentPage('login')}
              >
                Sign In
              </button>
              <button
                className="nav-link-btn nav-link-primary"
                onClick={() => setCurrentPage('register')}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      {/* 2. Page Content */}
      <main className="main-content">
        {currentPage === 'home' && (
          <HomePortal
            trackingNumber={trackingNumber}
            setTrackingNumber={setTrackingNumber}
            trackedComplaint={trackedComplaint}
            setTrackedComplaint={setTrackedComplaint}
            trackingError={trackingError}
            setTrackingError={setTrackingError}
            setCurrentPage={setCurrentPage}
            token={token}
          />
        )}
        {currentPage === 'login' && (
          <LoginScreen
            onLogin={handleLoginState}
            authError={authError}
            setAuthError={setAuthError}
            authSuccess={authSuccess}
            setAuthSuccess={setAuthSuccess}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === 'register' && (
          <RegisterScreen
            authError={authError}
            setAuthError={setAuthError}
            setAuthSuccess={setAuthSuccess}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === 'submit-complaint' && (
          <SubmitComplaintScreen token={token} user={user} setCurrentPage={setCurrentPage} />
        )}
        {currentPage === 'dashboard' && user && (
          <DashboardController token={token} user={user} activeTab={activeTab} setActiveTab={setActiveTab} setCurrentPage={setCurrentPage} />
        )}
      </main>
    </div>
  );
}

// ============================================================================
//                          PAGE 1: GUEST PORTAL
// ============================================================================
function HomePortal({ trackingNumber, setTrackingNumber, trackedComplaint, setTrackedComplaint, trackingError, setTrackingError, setCurrentPage, token }) {
  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/complaints/track/${trackingNumber.trim()}`);
      const data = await res.json();
      if (data.success) {
        setTrackedComplaint(data.complaint);
        setTrackingError('');
      } else {
        setTrackedComplaint(null);
        setTrackingError(data.message || 'Tracking number not found.');
      }
    } catch (err) {
      setTrackingError('Cannot reach the server. Please ensure the backend is running.');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-badge">
          <Shield size={14} /> Oromia Science & Technology Authority
        </div>
        <h1 className="hero-title">
          Transparent <span className="hero-gradient-text">Complaint</span>{' '}
          Management
        </h1>
        <p className="hero-subtitle">
          Submit, track, and resolve grievances securely. Our system ensures every
          complaint is handled with accountability, transparency, and speed.
        </p>
        <div className="hero-cta-group">
          <button className="btn btn-primary btn-lg" onClick={() => setCurrentPage('register')}>
            <PlusCircle size={18} /> File a Complaint
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setCurrentPage('login')}>
            <UserIcon size={18} /> Staff Login
          </button>
        </div>
      </div>

      {/* Tracking Box */}
      <div className="track-box">
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Track Your Complaint</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Enter your reference code to see real-time status and timeline
          </p>
          <form onSubmit={handleTrack} className="track-form">
            <div className="track-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CMS-2026-00042"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">Track Now</button>
          </form>
          {trackingError && (
            <div className="alert alert-error" style={{ marginTop: '1rem', justifyContent: 'center' }}>
              {trackingError}
            </div>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="features-grid">
        {[
          { icon: <Shield size={24} color="#60a5fa" />, bg: 'rgba(59,130,246,.12)', title: 'Secure & Encrypted', desc: 'All complaint data is protected with JWT authentication and HTTPS encryption.' },
          { icon: <Activity size={24} color="#34d399" />, bg: 'rgba(16,185,129,.12)', title: 'Real-time Tracking', desc: 'Monitor the exact status of your case through every stage of investigation.' },
          { icon: <Users size={24} color="#a78bfa" />, bg: 'rgba(139,92,246,.12)', title: 'Role-based Access', desc: 'Admins, officers, and citizens each have tailored permissions and workflows.' },
          { icon: <FileText size={24} color="#fbbf24" />, bg: 'rgba(234,179,8,.12)', title: 'Evidence Uploads', desc: 'Attach documents, photos, and media as supporting evidence to your complaint.' },
        ].map((f, i) => (
          <div className="feature-card" key={i}>
            <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Tracked complaint result */}

      {trackedComplaint && (
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tracking ID</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{trackedComplaint.trackingNumber}</h3>
            </div>
            <span className={`badge badge-${trackedComplaint.status}`}>{trackedComplaint.status}</span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Complaint Details</h4>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{trackedComplaint.description}</p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span><strong>Category:</strong> {trackedComplaint.category}</span>
                <span><strong>Occurred:</strong> {trackedComplaint.dateOfOccurrence}</span>
                <span><strong>Location:</strong> {trackedComplaint.locationAddress}</span>
              </div>
            </div>
          </div>

          {/* Evidence Files */}
          {trackedComplaint.evidence && trackedComplaint.evidence.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Attached Evidence Files</h4>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {trackedComplaint.evidence.map((file, idx) => (
                  <a 
                    key={idx}
                    href={`${BACKEND_URL}${file.file_path}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#38bdf8', textDecoration: 'none' }}
                  >
                    <FileText size={16} /> {file.file_name} ({(file.file_size/1024).toFixed(1)} KB)
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline visualization */}
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Grievance Progress Timeline</h4>
            <div className="timeline-container">
              {trackedComplaint.timeline.map((item, idx) => (
                <div className="timeline-item" key={idx}>
                  <div className={`timeline-dot ${idx === trackedComplaint.timeline.length - 1 ? 'active' : ''}`}></div>
                  <div className="timeline-content">
                    <div className="timeline-date">{new Date(item.timestamp).toLocaleString()}</div>
                    <div className="timeline-title">{item.status.replace('_', ' ')}</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.details}</p>
                    
                    {item.resolution && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(16,185,129,0.05)', border: '1px dashed rgba(16,185,129,0.3)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'block' }}>RESOLUTION DECISION:</span>
                        <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>{item.resolution}</p>
                        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>ACTIONS INITIATED:</span>
                        <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>{item.actions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
//                          PAGE 2: SIGN IN
// ============================================================================
function LoginScreen({ onLogin, authError, setAuthError, authSuccess, setAuthSuccess, setCurrentPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.token, data.user);
      } else {
        setAuthError(data.message || 'Invalid credentials. Please try again.');
        setAuthSuccess('');
      }
    } catch (err) {
      setAuthError('Cannot reach the server. Please ensure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <Lock size={28} color="#38bdf8" />
          </div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to access your secure dashboard and manage complaints</p>
        </div>

        {authSuccess && <div className="alert alert-success">{authSuccess}</div>}
        {authError && <div className="alert alert-error">{authError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@oromia.gov.et"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : <><Lock size={16} /> Sign In Securely</>}
          </button>
        </form>

        <hr className="auth-divider" />

        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Credentials</div>
          <div style={{ display: 'grid', gap: '0.3rem' }}>
            {[
              { role: 'Admin', email: 'admin@oromia.gov.et', pass: 'AdminPassword123!' },
              { role: 'Citizen', email: 'citizen@example.com', pass: 'Citizen123!' },
              { role: 'Officer', email: 'officer.environmental@oromia.gov.et', pass: 'OfficerPassword123!' },
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '0.2rem 0' }}
                onClick={() => { setEmail(d.email); setPassword(d.pass); }}>
                <span style={{ color: '#94a3b8' }}>{d.role}:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.78rem' }}>{d.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-footer-link">
          No account yet? <span onClick={() => setCurrentPage('register')}>Create one here</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                          PAGE 3: CITIZEN REGISTRATION
// ============================================================================
function RegisterScreen({ authError, setAuthError, setAuthSuccess, setCurrentPage }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    gender: 'Male',
    phone: '',
    region: '',
    city: '',
    woreda: '',
    kebele: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setAuthSuccess('Registration successful! Please sign in with your credentials.');
        setAuthError('');
        setCurrentPage('login');
      } else {
        setAuthError(data.message || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setAuthError('Cannot connect to server. Please ensure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <UserIcon size={28} color="#38bdf8" />
          </div>
          <h2 className="auth-title">Create Your Account</h2>
          <p className="auth-subtitle">Register as a citizen to file and track complaints with the bureau</p>
        </div>

        {authError && <div className="alert alert-error">{authError}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div className="auth-section-label"><UserIcon size={13} /> Personal Details</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="fullName" className="form-input" placeholder="Abebe Kebede" value={formData.fullName} required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input form-select" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-input" placeholder="abebe@example.com" value={formData.email} required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="form-input" placeholder="+251912345678" value={formData.phone} required onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password <span style={{color:'var(--text-dim)',fontWeight:400}}>(min. 8 characters)</span></label>
            <div className="input-group">
              <input type={showPass ? 'text' : 'password'} name="password" className="form-input" placeholder="••••••••" value={formData.password} required onChange={handleChange} />
              <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Location */}
          <hr className="auth-divider" />
          <div className="auth-section-label"><MapPin size={13} /> Location Details</div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Region</label>
              <input type="text" name="region" className="form-input" placeholder="e.g. Oromia" value={formData.region} required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Zone / City</label>
              <input type="text" name="city" className="form-input" placeholder="Adama" value={formData.city} required onChange={handleChange} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Woreda</label>
              <input type="text" name="woreda" className="form-input" placeholder="Woreda 03" value={formData.woreda} required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Kebele</label>
              <input type="text" name="kebele" className="form-input" placeholder="Kebele 04" value={formData.kebele} required onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : <><UserIcon size={16} /> Create Account</>}
          </button>
        </form>

        <div className="auth-footer-link">
          Already have an account? <span onClick={() => setCurrentPage('login')}>Sign in here</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                          PAGE 4: SUBMIT COMPLAINT
// ============================================================================
function SubmitComplaintScreen({ token, user, setCurrentPage }) {
  const [formData, setFormData] = useState({
    category: user.role === 'staff' ? 'workplace' : 'environmental',
    description: '',
    dateOfOccurrence: '',
    locationAddress: '',
    gpsCoordinates: '',
    priority: 'medium',
    confidentiality: 'public'
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const citizenCategories = ['environmental', 'service_delivery', 'administrative', 'personal'];
  const staffCategories = ['workplace', 'operational', 'administrative', 'personal'];
  const categories = user.role === 'staff' ? staffCategories : citizenCategories;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const dataPayload = new FormData();
      Object.keys(formData).forEach(key => {
        dataPayload.append(key, formData[key]);
      });
      
      files.forEach(file => {
        dataPayload.append('files', file);
      });

      const res = await fetch(`${API_BASE}/complaints/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: dataPayload
      });
      const data = await res.json();

      if (data.success) {
        setSuccessData(data);
      } else {
        setSubmitError(data.message || 'Failed to submit complaint.');
      }
    } catch (err) {
      setSubmitError('Connection error while logging complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }} className="glass-card">
        <CheckCircle size={60} color="#10b981" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Complaint Logged Successfully!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Your complaint has been successfully registered. Our administrative reviewers have queued it for action.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Your Tracking ID</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '1px' }}>{successData.trackingNumber}</span>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Please write down or screenshot this tracking code to monitor progress on our live portal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setCurrentPage('home')}>Return to Track Portal</button>
          <button className="btn btn-primary" onClick={() => setCurrentPage('dashboard')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '750px', margin: '2rem auto' }} className="glass-card">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Log a Formal Complaint</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Specify parameters, outline details, and attach evidence securely.
        </p>
      </div>

      {submitError && (
        <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Complaint Category</label>
            <select name="category" className="form-input form-select" value={formData.category} onChange={handleChange}>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Occurrence</label>
            <input type="date" name="dateOfOccurrence" className="form-input" required onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Detailed Description</label>
          <textarea 
            name="description" 
            className="form-input" 
            rows={5} 
            placeholder="Please detail the event chronology, entities involved, and requested resolution..." 
            required 
            onChange={handleChange}
            style={{ resize: 'vertical' }}
          ></textarea>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Location Address</label>
            <input type="text" name="locationAddress" className="form-input" placeholder="e.g. Adama Industrial Park, Factory B" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">GPS Geolocation (Optional)</label>
            <input type="text" name="gpsCoordinates" className="form-input" placeholder="e.g. 8.5414, 39.2689" onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <select name="priority" className="form-input form-select" value={formData.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Visibility Preference</label>
            <select name="confidentiality" className="form-input form-select" value={formData.confidentiality} onChange={handleChange}>
              <option value="public">Public (Visible after resolution)</option>
              <option value="confidential">Confidential (Administrators and assigned officers only)</option>
            </select>
          </div>
        </div>

        {/* Evidence upload container */}
        <div className="form-group" style={{ margin: '1.5rem 0' }}>
          <label className="form-label">Attach Supporting Evidence (Max 5 files, Max 25MB each)</label>
          <div style={{ border: '2px dashed var(--border-color)', padding: '2rem', borderRadius: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
            <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Drag and drop supporting materials or click below.
            </p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>
              Allowed formats: PDF, Word documents, PNG, JPG, MP4, MP3
            </span>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }}
            />
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Attached Files:</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {files.map((file, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={14} /> {file.name} ({(file.size/1024).toFixed(0)} KB)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setCurrentPage('dashboard')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting Form...' : 'Submit Grievance File'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
//                     PAGE 5: ROLE-BASED DASHBOARDS CONTROLLER
// ============================================================================
function DashboardController({ token, user, activeTab, setActiveTab, setCurrentPage }) {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Admin and Department Head specific states
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard metrics
      const statsRes = await fetch(`${API_BASE}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      // 2. Fetch complaints listing
      const compRes = await fetch(`${API_BASE}/complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (compData.success) setComplaints(compData.complaints);

      // 3. Fetch role-specific admin/head operations
      if (user.role === 'admin' || user.role === 'dept_head') {
        const deptRes = await fetch(`${API_BASE}/admin/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const deptData = await deptRes.json();
        if (deptData.success) setDepartments(deptData.departments);
      }

      if (user.role === 'admin') {
        const usersRes = await fetch(`${API_BASE}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersData.success) setUsers(usersData.users);

        const logsRes = await fetch(`${API_BASE}/admin/audit-logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        if (logsData.success) setAuditLogs(logsData.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="sidebar-profile-role">Logged in as</div>
          <div className="sidebar-profile-badge">
            {user.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
          <div className="sidebar-profile-name">{user.fullName}</div>
        </div>

        <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSelectedComplaint(null); }}>
          <BarChart3 size={17} /> Overview
        </button>
        <button className={`sidebar-btn ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => { setActiveTab('complaints'); setSelectedComplaint(null); }}>
          <FileText size={17} /> Complaints Queue
        </button>

        {user.role === 'admin' && (
          <>
            <button className={`sidebar-btn ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => { setActiveTab('departments'); setSelectedComplaint(null); }}>
              <Building size={17} /> Departments
            </button>
            <button className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setSelectedComplaint(null); }}>
              <Users size={17} /> Internal Accounts
            </button>
            <button className={`sidebar-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => { setActiveTab('audit'); setSelectedComplaint(null); }}>
              <Shield size={17} /> Security Logs
            </button>
          </>
        )}

        {(user.role === 'citizen' || user.role === 'staff') && (
          <button 
            className="sidebar-btn" 
            style={{ 
              marginTop: '1rem', 
              background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', 
              color: '#fff', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)'
            }} 
            onClick={() => setCurrentPage('submit-complaint')}
          >
            <PlusCircle size={17} /> File Complaint
          </button>
        )}
      </aside>

      {/* Main dashboard panel */}
      <section>
        {selectedComplaint ? (
          <ComplaintWorkspace 
            complaintId={selectedComplaint} 
            token={token} 
            user={user}
            departments={departments}
            onBack={() => { setSelectedComplaint(null); fetchData(); }}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <DashboardOverview stats={stats} user={user} complaints={complaints} onViewCase={setSelectedComplaint} setCurrentPage={setCurrentPage} />
            )}
            {activeTab === 'complaints' && (
              <ComplaintsListing user={user} complaints={complaints} onViewCase={setSelectedComplaint} setCurrentPage={setCurrentPage} />
            )}
            {activeTab === 'departments' && user.role === 'admin' && (
              <DepartmentsPanel token={token} departments={departments} onRefresh={fetchData} />
            )}
            {activeTab === 'users' && user.role === 'admin' && (
              <UsersPanel token={token} users={users} departments={departments} onRefresh={fetchData} />
            )}
            {activeTab === 'audit' && user.role === 'admin' && (
              <AuditLogsPanel logs={auditLogs} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD SUB-COMPONENT: OVERVIEW
// ============================================================================
function DashboardOverview({ stats, user, complaints, onViewCase, setCurrentPage }) {
  const latestCases = complaints.slice(0, 6);

  return (
    <div className="page-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>Dashboard Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Welcome back, {user.fullName}. Here's your current system snapshot.</p>
        </div>
        {(user.role === 'citizen' || user.role === 'staff') && (
          <button 
            className="btn btn-primary" 
            onClick={() => setCurrentPage('submit-complaint')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <PlusCircle size={16} /> File New Complaint
          </button>
        )}
      </div>

      {/* Citizen / Staff empty state or encouragement banner */}
      {(user.role === 'citizen' || user.role === 'staff') && complaints.length === 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem', marginBottom: '2rem', border: '1px dashed var(--border-color)', background: 'rgba(59, 130, 246, 0.03)' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <FileText size={40} color="#60a5fa" />
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Complaints</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '450px', marginBottom: '1.5rem' }}>
            You haven't filed any complaints yet. If you have any environmental grievances, service delivery issues, or other operational matters, submit one now.
          </p>
          <button className="btn btn-primary" onClick={() => setCurrentPage('submit-complaint')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={16} /> File Your First Complaint
          </button>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card stat-card-blue">
            <div>
              <div className="stat-title">Total Cases</div>
              <div className="stat-value" style={{ color: '#60a5fa' }}>{stats.totalComplaints}</div>
              <div className="stat-change">All registered complaints</div>
            </div>
            <div className="stat-icon-wrap stat-icon-blue"><FileText size={26} color="#60a5fa" /></div>
          </div>

          <div className="stat-card stat-card-orange">
            <div>
              <div className="stat-title">Pending Action</div>
              <div className="stat-value" style={{ color: '#fb923c' }}>{stats.pendingCount}</div>
              <div className="stat-change">Awaiting resolution</div>
            </div>
            <div className="stat-icon-wrap stat-icon-orange"><Clock size={26} color="#fb923c" /></div>
          </div>

          <div className="stat-card stat-card-green">
            <div>
              <div className="stat-title">Resolved</div>
              <div className="stat-value" style={{ color: '#34d399' }}>{stats.resolvedCount}</div>
              <div className="stat-change">Successfully closed</div>
            </div>
            <div className="stat-icon-wrap stat-icon-green"><CheckCircle size={26} color="#34d399" /></div>
          </div>

          <div className="stat-card stat-card-red">
            <div>
              <div className="stat-title">Backlogged</div>
              <div className="stat-value" style={{ color: '#f87171' }}>{stats.backlogCount}</div>
              <div className="stat-change">Past deadline</div>
            </div>
            <div className="stat-icon-wrap stat-icon-red"><AlertTriangle size={26} color="#f87171" /></div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <TrendingUp size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Resolution Index</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{stats?.resolutionRate || '—'}</span>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Turnaround &amp; resolution compliance score</p>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
            <Building size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>By Category</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {stats?.categoryStats && stats.categoryStats.length > 0 ? (
              stats.categoryStats.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.2rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{item.category.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, color: '#60a5fa' }}>{item.count}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No data available yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="section-header">
          <div>
            <div className="section-title">Recent Cases</div>
            <div className="section-subtitle">Latest complaints in the system</div>
          </div>
        </div>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Category</th>
                <th>Complainant</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Filed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {latestCases.map((comp, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem' }}>{comp.tracking_number}</td>
                  <td style={{ textTransform: 'capitalize' }}>{comp.category.replace('_', ' ')}</td>
                  <td>{comp.Complainant?.full_name || <span style={{color:'var(--text-muted)'}}>Guest</span>}</td>
                  <td><span className={`badge badge-${comp.status}`}>{comp.status.replace('_',' ')}</span></td>
                  <td><span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.85rem', color: comp.priority === 'urgent' ? '#f87171' : comp.priority === 'high' ? '#fb923c' : 'var(--text-main)' }}>{comp.priority}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{new Date(comp.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => onViewCase(comp.id)}>
                      View <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {latestCases.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No complaints recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD SUB-COMPONENT: LISTING
// ============================================================================
function ComplaintsListing({ user, complaints, onViewCase, setCurrentPage }) {
  const [filter, setFilter] = useState('all');

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !['resolved', 'closed', 'rejected'].includes(c.status);
    if (filter === 'resolved') return c.status === 'resolved';
    if (filter === 'backlog') {
      const today = new Date().toISOString().split('T')[0];
      return !['resolved', 'closed', 'rejected'].includes(c.status) && c.deadline && c.deadline < today;
    }
    return true;
  });

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Complaints Queue File</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review all incoming, delegated, or completed files</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setFilter('all')}>All</button>
          <button className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setFilter('pending')}>Active</button>
          <button className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setFilter('resolved')}>Resolved</button>
          <button className={`btn ${filter === 'backlog' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setFilter('backlog')}>Backlog</button>
        </div>
      </div>

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Category</th>
              <th>complainant</th>
              <th>Assigned Department</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.map((comp, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>{comp.tracking_number}</td>
                <td style={{ textTransform: 'capitalize' }}>{comp.category.replace('_', ' ')}</td>
                <td>{comp.Complainant?.full_name || 'Guest'}</td>
                <td>{comp.AssignedDepartment?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                <td><span className={`badge badge-${comp.status}`}>{comp.status}</span></td>
                <td><span style={{ textTransform: 'capitalize', fontWeight: 600, color: comp.priority === 'urgent' ? '#ef4444' : comp.priority === 'high' ? '#fb923c' : 'var(--text-main)' }}>{comp.priority}</span></td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onViewCase(comp.id)}>
                    View Case <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredComplaints.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  <div style={{ marginBottom: '1rem' }}>No matching cases found in your folder.</div>
                  {(user.role === 'citizen' || user.role === 'staff') && (
                    <button className="btn btn-primary btn-sm" onClick={() => setCurrentPage('submit-complaint')}>
                      File a New Complaint
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD WORKSPACE: COMPLAINT WORKSPACE
// ============================================================================
function ComplaintWorkspace({ complaintId, token, user, departments, onBack }) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Assignment and Investigation input states
  const [selectedDept, setSelectedDept] = useState('');
  const [deptDeadline, setDeptDeadline] = useState('');
  const [deptOfficers, setDeptOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  
  const [investigationText, setInvestigationText] = useState('');
  const [investigationFindings, setInvestigationFindings] = useState('');
  const [investigationFiles, setInvestigationFiles] = useState([]);

  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionActions, setResolutionActions] = useState('');
  const [resolutionFiles, setResolutionFiles] = useState([]);
  const [approveFeedback, setApproveFeedback] = useState('');

  const [appealReason, setAppealReason] = useState('');

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch full complaint details via authenticated detail endpoint
      const detailRes = await fetch(`${API_BASE}/complaints/${complaintId}/detail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const detailData = await detailRes.json();

      if (!detailData.success) {
        setError(detailData.message || 'Could not load complaint.');
        setLoading(false);
        return;
      }

      const raw = detailData.complaint;

      // 2. Fetch timeline + evidence via public tracking endpoint
      const trackRes = await fetch(`${API_BASE}/complaints/track/${raw.tracking_number}`);
      const trackData = await trackRes.json();

      // Merge: raw DB fields + timeline/evidence from tracking payload
      const merged = {
        ...raw,
        trackingNumber: raw.tracking_number,
        locationAddress: raw.location_address,
        dateOfOccurrence: raw.date_of_occurrence,
        gpsCoordinates: raw.gps_coordinates,
        timeline: trackData.success ? trackData.complaint.timeline : [],
        evidence: trackData.success ? trackData.complaint.evidence : []
      };

      setComplaint(merged);

      // 3. Fetch officers for dept_head role using the scoped endpoint
      if (user.role === 'dept_head' && raw.assigned_department_id) {
        const deptId = raw.assigned_department_id;
        const offRes = await fetch(`${API_BASE}/admin/departments/${deptId}/officers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const offData = await offRes.json();
        if (offData.success) {
          setDeptOfficers(offData.officers);
        }
      }
    } catch (err) {
      setError('Connection error fetching complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId, token]);

  const handleRouteDept = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;

    try {
      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/assign-dept`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ departmentId: selectedDept, deadline: deptDeadline })
      });
      const data = await res.json();
      if (data.success) {
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating.');
    }
  };

  const handleRouteOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOfficer) return;

    try {
      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/assign-officer`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ officerId: selectedOfficer, instructions: assignInstructions })
      });
      const data = await res.json();
      if (data.success) {
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error updating.');
    }
  };

  const handleLogInvestigation = async (e) => {
    e.preventDefault();
    if (!investigationText) return;

    try {
      const formPayload = new FormData();
      formPayload.append('activityDescription', investigationText);
      formPayload.append('findings', investigationFindings);
      investigationFiles.forEach(file => {
        formPayload.append('files', file);
      });

      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/investigate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formPayload
      });
      const data = await res.json();
      if (data.success) {
        setInvestigationText('');
        setInvestigationFindings('');
        setInvestigationFiles([]);
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error.');
    }
  };

  const handleLogResolution = async (e) => {
    e.preventDefault();
    if (!resolutionSummary || !resolutionActions) return;

    try {
      const formPayload = new FormData();
      formPayload.append('resolutionSummary', resolutionSummary);
      formPayload.append('actionsTaken', resolutionActions);
      resolutionFiles.forEach(file => {
        formPayload.append('files', file);
      });

      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formPayload
      });
      const data = await res.json();
      if (data.success) {
        setResolutionSummary('');
        setResolutionActions('');
        setResolutionFiles([]);
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error.');
    }
  };

  const handleApproveResolution = async (decision) => {
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/approve-resolution`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision, feedback: approveFeedback })
      });
      const data = await res.json();
      if (data.success) {
        setApproveFeedback('');
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error.');
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealReason) return;

    try {
      const res = await fetch(`${API_BASE}/complaints/${complaint.id}/appeal`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: appealReason })
      });
      const data = await res.json();
      if (data.success) {
        setAppealReason('');
        fetchComplaintDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error.');
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p style={{color:'var(--text-muted)'}}>Loading case details...</p></div>;
  if (error) return <div className="glass-card"><p style={{ color: '#ef4444' }}>{error}</p><button className="btn btn-secondary" onClick={onBack}>Back</button></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back to List</button>
        <span className={`badge badge-${complaint.status}`}>{complaint.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Side: Case file details */}
        <div>
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Case File: {complaint.trackingNumber}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <p><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{complaint.category.replace('_', ' ')}</span></p>
              <p><strong>Logged Date:</strong> {new Date(complaint.created_at).toLocaleString()}</p>
              <p><strong>Priority Level:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600, color: complaint.priority === 'urgent' ? '#ef4444' : complaint.priority === 'high' ? '#fb923c' : 'inherit' }}>{complaint.priority}</span></p>
              <p><strong>Description:</strong></p>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-line' }}>
                {complaint.description}
              </div>
              <p><strong>Location:</strong> {complaint.locationAddress} {complaint.gpsCoordinates && `(${complaint.gpsCoordinates})`}</p>
              {complaint.deadline && <p><strong>Resolution Deadline:</strong> <span style={{ color: '#fb923c', fontWeight: 600 }}>{complaint.deadline}</span></p>}
            </div>

            {complaint.evidence && complaint.evidence.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Evidence Attachments:</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {complaint.evidence.map((file, idx) => (
                    <a 
                      key={idx}
                      href={`${BACKEND_URL}${file.file_path}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'none' }}
                    >
                      <FileText size={14} /> {file.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Milestones */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Chronological Timeline</h3>
            <div className="timeline-container">
              {complaint.timeline.map((item, idx) => (
                <div className="timeline-item" key={idx}>
                  <div className={`timeline-dot ${idx === complaint.timeline.length - 1 ? 'active' : ''}`}></div>
                  <div className="timeline-content">
                    <div className="timeline-date">{new Date(item.timestamp).toLocaleString()}</div>
                    <div className="timeline-title">{item.status.replace('_', ' ')}</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Workflow Actions (Conditional based on roles) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 1. Admin Routing (Submitted / Under Review state) */}
          {user.role === 'admin' && (complaint.status === 'submitted' || complaint.status === 'under_review') && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>Route Complaint to Directorate</h3>
              <form onSubmit={handleRouteDept}>
                <div className="form-group">
                  <label className="form-label">Select Target Department</label>
                  <select className="form-input form-select" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} required>
                    <option value="">-- Choose Department --</option>
                    {departments.map((dept, idx) => (
                      <option key={idx} value={dept.id}>{dept.name} ({dept.region})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Set Resolution Deadline</label>
                  <input type="date" className="form-input" value={deptDeadline} onChange={(e) => setDeptDeadline(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Confirm Assignment</button>
              </form>
            </div>
          )}

          {/* 2. Department Head Officer Allocation */}
          {user.role === 'dept_head' && complaint.status === 'assigned' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>Delegate to Complaint Officer</h3>
              <form onSubmit={handleRouteOfficer}>
                <div className="form-group">
                  <label className="form-label">Select Assigned Officer</label>
                  <select className="form-input form-select" value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)} required>
                    <option value="">-- Choose Officer --</option>
                    {deptOfficers.map((off, idx) => (
                      <option key={idx} value={off.id}>{off.full_name} ({off.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Investigation Instructions</label>
                  <textarea className="form-input" rows={3} value={assignInstructions} onChange={(e) => setAssignInstructions(e.target.value)} placeholder="Provide compliance directives, site visit targets..."></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Delegate Workload</button>
              </form>
            </div>
          )}

          {/* 3. Officer Action: Logging Steps & Submitting Resolution */}
          {user.role === 'officer' && (complaint.status === 'assigned' || complaint.status === 'in_progress') && (
            <>
              {/* Step logging */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#38bdf8' }}>Document Investigation Progress</h3>
                <form onSubmit={handleLogInvestigation}>
                  <div className="form-group">
                    <label className="form-label">Activity Description</label>
                    <input type="text" className="form-input" value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} placeholder="e.g. Conducted carbon filter pressure audit" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Key Findings & Notes (Optional)</label>
                    <textarea className="form-input" rows={2} value={investigationFindings} onChange={(e) => setInvestigationFindings(e.target.value)} placeholder="Log witness statements, emission indexes..."></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attach Audit Evidence (Optional)</label>
                    <input type="file" multiple onChange={(e) => setInvestigationFiles(Array.from(e.target.files))} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Log Activity Milestone</button>
                </form>
              </div>

              {/* Resolution submitting */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#34d399' }}>File Case Resolution</h3>
                <form onSubmit={handleLogResolution}>
                  <div className="form-group">
                    <label className="form-label">Resolution Decisions Summary</label>
                    <textarea className="form-input" rows={3} value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} placeholder="Summarize final administrative decisions, warnings, fine details..." required></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Concrete Corrective Actions Taken</label>
                    <textarea className="form-input" rows={2} value={resolutionActions} onChange={(e) => setResolutionActions(e.target.value)} placeholder="e.g. Levied fine, scheduled compliance recheck" required></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Official Signed Resolution Letter (Optional)</label>
                    <input type="file" onChange={(e) => setResolutionFiles(Array.from(e.target.files))} />
                  </div>
                  <button type="submit" className="btn btn-accent" style={{ width: '100%', background: 'var(--success-gradient)' }}>Submit for Review</button>
                </form>
              </div>
            </>
          )}

          {/* 4. Department Head Resolution Approval */}
          {user.role === 'dept_head' && complaint.status === 'pending_approval' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#fb923c' }}>Review Case Resolution Decision</h3>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <p><strong>Proposed Decision:</strong></p>
                <p style={{ color: '#a7f3d0', margin: '0.25rem 0' }}>{complaint.resolution_summary}</p>
                <p><strong>Corrective Actions:</strong></p>
                <p style={{ color: '#a7f3d0' }}>{complaint.actions_taken}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Approval Feedback / Rejection Notes</label>
                <textarea className="form-input" rows={2} value={approveFeedback} onChange={(e) => setApproveFeedback(e.target.value)} placeholder="Provide final remarks..."></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn" style={{ flex: 1, background: 'var(--success-gradient)', color: '#fff' }} onClick={() => handleApproveResolution('approve')}>
                  Approve Resolution
                </button>
                <button className="btn" style={{ flex: 1, background: 'var(--danger-gradient)', color: '#fff' }} onClick={() => handleApproveResolution('reject')}>
                  Reject Decision
                </button>
              </div>
            </div>
          )}

          {/* 5. Complainant Appeal Option (within 15 days of Resolved/Rejected) */}
          {(user.role === 'citizen' || user.role === 'staff') && (complaint.status === 'resolved' || complaint.status === 'rejected') && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#f472b6' }}>Submit Case Appeal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                If you find the resolution decision unsatisfactory, you can appeal within 15 days of closure for administrative review.
              </p>
              <form onSubmit={handleAppealSubmit}>
                <div className="form-group">
                  <label className="form-label">Appeal Reason & Justification</label>
                  <textarea className="form-input" rows={3} value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Detail the grounds of appeal, missing facts, ongoing issues..." required></textarea>
                </div>
                <button type="submit" className="btn btn-accent" style={{ width: '100%', background: 'var(--danger-gradient)' }}>
                  File Formal Appeal
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD PANEL: DEPARTMENTS (Admin only)
// ============================================================================
function DepartmentsPanel({ token, departments, onRefresh }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('Oromia');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch(`${API_BASE}/admin/departments/create`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, region })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setDescription('');
        onRefresh();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
      <div className="glass-card" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Create Directorate
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Directorate Name</label>
            <input type="text" className="form-input" placeholder="e.g. Environmental Control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Geographical Region</label>
            <input type="text" className="form-input" value={region} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Functional Description</label>
            <textarea className="form-input" rows={3} placeholder="Functional directives..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Directorate</button>
        </form>
      </div>

      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Organizational Directorate Structure</h3>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Directorate Name</th>
                <th>Region</th>
                <th>Directorate Head</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, idx) => (
                <tr key={idx}>
                  <td>{dept.id}</td>
                  <td style={{ fontWeight: 700 }}>{dept.name}</td>
                  <td>{dept.region}</td>
                  <td>{dept.Manager?.full_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Vacant</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD PANEL: USERS & ACCOUNTS (Admin only)
// ============================================================================
function UsersPanel({ token, users, departments, onRefresh }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'officer',
    employeeId: '',
    departmentId: '',
    gender: 'Male',
    phone: '',
    region: 'Oromia',
    city: '',
    woreda: '',
    kebele: ''
  });
  const [tempPassword, setTempPassword] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTempPassword('');
    
    try {
      const res = await fetch(`${API_BASE}/admin/users/create`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setTempPassword(data.tempPassword);
        onRefresh();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error creating profile.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
      <div className="glass-card" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Create Personnel Profile
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="fullName" className="form-input" placeholder="Yared Tolosa" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" name="email" className="form-input" placeholder="yared@oromia.gov.et" required onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select name="role" className="form-input form-select" onChange={handleChange}>
                <option value="officer">Officer</option>
                <option value="dept_head">Director Head</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input form-select" onChange={handleChange}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Employee ID Code</label>
            <input type="text" name="employeeId" className="form-input" placeholder="e.g. EMP-058" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Directorate</label>
            <select name="departmentId" className="form-input form-select" onChange={handleChange}>
              <option value="">-- Choose Directorate --</option>
              {departments.map((dept, idx) => (
                <option key={idx} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="text" name="phone" className="form-input" placeholder="+251911..." required onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input type="text" name="city" className="form-input" required onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Woreda</label>
              <input type="text" name="woreda" className="form-input" required onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kebele</label>
            <input type="text" name="kebele" className="form-input" required onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Generate Account</button>
        </form>

        {tempPassword && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px dashed rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600, display: 'block' }}>TEMPORARY PASSWORD GENERATED:</span>
            <span style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '1px', fontWeight: 800, display: 'block', margin: '0.25rem 0' }}>{tempPassword}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Copy this password. The personnel must change it upon their first authentication.</span>
          </div>
        )}
      </div>

      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>System Personnel Listings</h3>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Directorate</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{u.employee_id || 'N/A'}</td>
                  <td style={{ fontWeight: 700 }}>{u.full_name}</td>
                  <td><span className="badge badge-submitted" style={{ padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.05)' }}>{u.role}</span></td>
                  <td>{u.Department?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//                  DASHBOARD PANEL: SECURITY AUDIT (Admin only)
// ============================================================================
function AuditLogsPanel({ logs }) {
  return (
    <div className="glass-card">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Immutable Security Audit Trails</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time cryptographic logs tracking logins, status changes, and file uploads</p>
      </div>

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>IP Address</th>
              <th>Action Code</th>
              <th>Target ID</th>
              <th>Personnel / User</th>
              <th>Activity Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ip_address}</td>
                <td><span className="badge" style={{ padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{log.action}</span></td>
                <td style={{ fontWeight: 600 }}>{log.target_id || '-'}</td>
                <td>{log.User?.full_name || 'Guest User'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
