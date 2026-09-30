import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, CalendarDays } from 'lucide-react';
import { signup as apiSignup } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    age: '',
    password: '',
    confirmPassword: '',
    imageConsent: false,
    termsConsent: false,
    medicalConsent: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.termsConsent) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }
    if (!formData.medicalConsent) {
      setError('You must acknowledge the Medical Disclaimer.');
      return;
    }
    if (!formData.imageConsent) {
      setError('You must authorize image storage and usage to create an account.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      const signupData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        age: formData.age,
        password: formData.password,
        consent: {
          terms_accepted: formData.termsConsent,
          medical_disclaimer_acknowledged: formData.medicalConsent,
          image_processing_authorized: formData.imageConsent
        }
      };
      const data = await apiSignup(signupData);
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

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 40px',
    borderRadius: '10px',
    border: '1px solid var(--color-gray-200)',
    background: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: 'var(--color-navy-deep)'
  };

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-gray-400)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '92px',
      paddingBottom: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Atmospheric blobs */}
      <div style={{ position: 'absolute', top: '5%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(232,99,74,0.05) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(46,58,110,0.05) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="subtle-card"
        style={{
          padding: '40px',
          width: '90%',
          maxWidth: '600px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-navy-deep)' }}>
            Create an Account
          </h1>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '14px' }}>
            Join Klinik to save your analysis history and track progress.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(232, 99, 74, 0.1)', color: 'var(--color-coral-accent)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Full Name */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><User size={18} /></div>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Email */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><Mail size={18} /></div>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Phone Number */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><Phone size={18} /></div>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} required style={{ ...inputStyle, paddingLeft: '16px', appearance: 'none' }} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'}>
              <option value="" disabled>Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Age</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><CalendarDays size={18} /></div>
              <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="25" min="13" max="120" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><Lock size={18} /></div>
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <div style={iconStyle}><Lock size={18} /></div>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--color-navy-deep)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-gray-200)'} />
            </div>
          </div>

          {/* Terms & Privacy Consent */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '12px' }}>
            <input
              type="checkbox"
              id="termsConsent"
              name="termsConsent"
              checked={formData.termsConsent}
              onChange={handleChange}
              required
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
            <label htmlFor="termsConsent" style={{ fontSize: '12px', color: 'var(--color-gray-600)', lineHeight: '1.4', cursor: 'pointer' }}>
              I agree to the <Link to="/terms" target="_blank" style={{ color: 'var(--color-navy-deep)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link> and <Link to="/privacy" target="_blank" style={{ color: 'var(--color-navy-deep)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
            </label>
          </div>

          {/* Medical Disclaimer Consent */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
            <input
              type="checkbox"
              id="medicalConsent"
              name="medicalConsent"
              checked={formData.medicalConsent}
              onChange={handleChange}
              required
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
            <label htmlFor="medicalConsent" style={{ fontSize: '12px', color: 'var(--color-gray-600)', lineHeight: '1.4', cursor: 'pointer' }}>
              I understand that Klinik is an educational, non-diagnostic skin assessment tool and does not provide professional healthcare, medical diagnosis, or prescription treatment.
            </label>
          </div>

          {/* Consent Checkbox */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
            <input
              type="checkbox"
              id="imageConsent"
              name="imageConsent"
              checked={formData.imageConsent}
              onChange={handleChange}
              required
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
            <label htmlFor="imageConsent" style={{ fontSize: '12px', color: 'var(--color-gray-600)', lineHeight: '1.4', cursor: 'pointer' }}>
              I authorize Klinik to upload and process facial images using cloud infrastructure for automated skin assessments, and to store them as pending or account check-in records.
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
            <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', padding: '16px', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
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
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--color-gray-500)', lineHeight: '1.4' }}>
          Review our{' '}
          <Link to="/terms" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Privacy Policy</Link>.
        </p>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-navy-deep)', textDecoration: 'none', fontWeight: 600 }}>
            Log In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
