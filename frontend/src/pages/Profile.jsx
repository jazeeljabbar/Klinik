import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '32px 24px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Profile Header */}
      <div className="subtle-card" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-slate-100)', color: 'var(--color-navy-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <User size={40} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px' }}>
          {user?.name || 'User'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-gray-600)', marginBottom: '4px' }}>
          <Mail size={16} />
          <span>{user?.email || 'No email provided'}</span>
        </div>
        {user?.phone && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-gray-600)' }}>
            <Phone size={16} />
            <span>{user.phone}</span>
          </div>
        )}
      </div>

      {/* Privacy Section */}
      <div className="subtle-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--color-navy-deep)' }}>
          <ShieldCheck size={24} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Privacy & Legal Consent</h3>
        </div>
        <p style={{ fontSize: '15px', color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: '16px' }}>
          Your scan images and analysis history are strictly private to this signed-in account. They are securely stored to allow you to track changes over time and are never shared publicly or used to train public AI models.
        </p>
        
        <div style={{
          background: 'var(--color-slate-50)',
          padding: '14px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: '13px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-gray-600)' }}>Consent Status:</span>
            <span style={{
              fontWeight: 600,
              color: user?.consents?.terms_accepted ? 'var(--color-mint-success)' : 'var(--color-coral-accent)'
            }}>
              {user?.consents?.terms_accepted ? 'Active & Recorded' : 'Pending Confirmation'}
            </span>
          </div>
          {user?.consents?.policy_version && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-gray-600)' }}>Policy Version:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-navy-deep)' }}>
                {user.consents.policy_version}
              </span>
            </div>
          )}
          {user?.consents?.recorded_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-gray-600)' }}>Recorded (Server UTC):</span>
              <span style={{ fontWeight: 600, color: 'var(--color-navy-deep)' }}>
                {new Date(user.consents.recorded_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/privacy" style={{ color: 'var(--color-navy-deep)', fontWeight: 600, textDecoration: 'underline', fontSize: '14px' }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: 'var(--color-navy-deep)', fontWeight: 600, textDecoration: 'underline', fontSize: '14px' }}>
            Terms of Service
          </Link>
        </div>
      </div>

      {/* Account Actions */}
      <div className="subtle-card" style={{ padding: '16px' }}>
        <button 
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>

    </div>
  );
}
