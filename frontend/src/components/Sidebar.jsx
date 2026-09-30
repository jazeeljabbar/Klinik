import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Clock, User, LogOut, ChevronRight, GitCompare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: 'My Skin', path: '/dashboard', icon: Home },
    { name: 'Skin Check-ins', path: '/skin-check-ins', icon: Clock },
    { name: 'Skin Journey', path: '/skin-journey', icon: GitCompare },
    { name: 'Profile & Privacy', path: '/profile', icon: User },
  ];

  const isActive = (path) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <aside className="desktop-only-block" style={{
      width: '280px',
      background: '#fff',
      borderRight: '1px solid var(--color-gray-200)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      padding: '24px 0',
      zIndex: 100
    }}>
      {/* Brand */}
      <div style={{ padding: '0 24px', marginBottom: '40px' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.2rem'
          }}>
            K
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)', letterSpacing: '-0.02em' }}>Klinik</span>
        </Link>
      </div>

      {/* Primary Action */}
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
        <Link to="/scan" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--color-navy-deep)',
          color: '#fff',
          padding: '14px',
          borderRadius: '12px',
          textDecoration: 'none',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(13, 27, 62, 0.15)',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
        >
          <Camera size={20} />
          New Skin Check
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-gray-600)',
              background: isActive(item.path) ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
              fontWeight: isActive(item.path) ? 600 : 500,
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            <item.icon size={20} />
            {item.name}
            {isActive(item.path) && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div style={{ padding: '24px 24px 0 24px', borderTop: '1px solid var(--color-gray-200)' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-gray-600)',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left'
          }}
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </aside>
  );
}
