import { useLocation, Link } from 'react-router-dom';
import { User } from 'lucide-react';

export default function TopHeader() {
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'My Skin';
      case '/scan':
        return 'Skin Check';
      case '/skin-check-ins':
        return 'Skin Check-ins';
      case '/skin-journey':
        return 'Skin Journey';
      case '/profile':
        return 'Profile & Privacy';
      default:
        return '';
    }
  };

  return (
    <header style={{
      height: '72px',
      background: '#fff',
      borderBottom: '1px solid var(--color-slate-200)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 900
    }}>
      {/* Mobile left side: Klinik wordmark */}
      <div className="mobile-only-block" style={{ flex: 1 }}>
        <Link to="/">
          <img src="/klinik-logo-wordmark.png" alt="Klinik Logo" style={{ height: '30px', width: 'auto', display: 'block' }} onError={(e) => { e.target.src = '/klinik-logo-vector.svg'; }} />
        </Link>
      </div>

      {/* Desktop left side: Title */}
      <div className="desktop-only-block" style={{ flex: 1 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-navy-deep)', margin: 0 }}>
          {getTitle()}
        </h1>
      </div>

      {/* Right side: Avatar access (mobile optional, maybe desktop too) */}
      <Link to="/profile" style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'var(--color-slate-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-navy-deep)',
        textDecoration: 'none'
      }}>
        <User size={20} />
      </Link>
    </header>
  );
}
