import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMail, FiLock, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { requestOtp, verifyOtp, resetPassword } from '../utils/api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 44px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: 'rgba(255,255,255,0.9)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await requestOtp(email);
      setSuccessMsg(res.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && index > 0 && otp[index] === '') {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(email, otpStr);
      setSuccessMsg('');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email, otp.join(''), passwords.newPassword);
      setStep(4);
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
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        top: '10%',
        right: '-100px',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>Forgot Password</h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Enter your email address to receive a reset code.</p>
              </div>
              {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><FiMail /></div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? 'Sending...' : <><span style={{marginRight: '8px'}}>Send OTP</span> <FiArrowRight /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>Verify OTP</h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Enter the 4-digit code sent to <br/><strong>{email}</strong></p>
              </div>
              {successMsg && <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>{successMsg}</div>}
              {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
              <form onSubmit={handleOtpSubmit}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      style={{
                        width: '60px',
                        height: '60px',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        color: '#1e293b',
                        background: 'rgba(255,255,255,0.9)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  ))}
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>New Password</h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Create a strong new password for your account.</p>
              </div>
              {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><FiLock /></div>
                    <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} placeholder="Enter new password" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><FiLock /></div>
                    <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} placeholder="Confirm new password" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} style={{ color: '#10b981', fontSize: '4rem', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <FiCheckCircle />
                </motion.div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', color: '#1e293b' }}>Password Reset</h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '32px' }}>Your password has been successfully updated. You can now log in with your new password.</p>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', padding: '16px' }}>
                  Go to Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {step === 1 && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
             <Link to="/login" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}>
                &larr; Back to login
             </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
