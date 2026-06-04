import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, Mail, User } from 'lucide-react';
import GlassPanel from '../components/GlassPanel';
import { api } from '../utils/api';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await api.login(username, password);
      } else {
        await api.register(username, email, password);
        // Automatically login after successful registration
        await api.login(username, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <GlassPanel className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', marginBottom: '16px' }}>
            <Cpu size={32} className="cyan" style={{ animation: 'pulseGlow 2s infinite alternate' }} />
          </div>
          <h2>{isLogin ? 'Welcome Back' : 'Create Developer Profile'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {isLogin ? 'Enter details to access command-center' : 'Sign up to construct autonomous agents'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '36px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '36px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Authenticating...' : isLogin ? 'Login Workspace' : 'Build Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? "New to the platform? " : "Already have an account? "}
          </span>
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: '600' }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Auth;
