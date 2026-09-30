import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--color-navy-deep)',
      color: '#fff',
      marginTop: 'auto'
    }}>
      <div className="container" style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '32px'
        }}>
          {/* Left: Klinik Wordmark */}
          <div style={{ flex: '1 1 200px' }}>
            <img src="/klinik-logo-wordmark-white.png" alt="Klinik Logo" style={{ width: '130px', height: 'auto' }} onError={(e) => { e.target.src = '/klinik-logo-vector-white.svg'; }} />
          </div>

          {/* Center: Brand Tagline */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-400)', margin: 0, textAlign: 'center' }}>
              Empowering proactive, personal skin tracking.
            </p>
          </div>

          {/* Right: Links */}
          <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
            <Link to="/privacy" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Terms</Link>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

        {/* Copyright */}
        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-400)', margin: 0 }}>
            © 2026 Klinik. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
