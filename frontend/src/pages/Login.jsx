import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { login as apiLogin } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { login } = useAuth();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data.user, data.token);
      
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      paddingTop: '92px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Atmospheric blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(34,198,142,0.05) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(46,58,110,0.04) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="subtle-card"
        style={{
          padding: '48px',
          width: '100%',
          maxWidth: '480px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--color-navy-deep)'
          }}>Welcome Back</h1>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '14px' }}>
            Log in to access your skin analysis history.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(232, 99, 74, 0.1)', color: 'var(--color-coral-accent)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email Input */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-gray-200)',
                  background: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  color: 'var(--color-navy-deep)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>
                Password
              </label>
              <Link to="/forgot-password" style={{ color: 'var(--color-navy-deep)', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }}>
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-gray-200)',
                  background: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  color: 'var(--color-navy-deep)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '10px', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--color-gray-400)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
          <span style={{ padding: '0 10px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
        </div>

        <GoogleAuthButton 
          onError={(msg) => { setError(msg); setIsLoading(false); }} 
          onStart={() => { setError(''); setIsLoading(true); }} 
        />

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--color-navy-deep)', textDecoration: 'none', fontWeight: 600 }}>
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
