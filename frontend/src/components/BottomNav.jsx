import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Clock, GitCompare, User } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'My Skin', icon: Home },
    { to: '/scan', label: 'Skin Check', icon: Camera },
    { to: '/skin-check-ins', label: 'Check-ins', icon: Clock },
    { to: '/skin-journey', label: 'Journey', icon: GitCompare },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid var(--color-slate-200)',
      paddingBottom: 'env(safe-area-inset-bottom)', // for iOS
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 1000
    }} className="mobile-only-flex">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.to);
        return (
          <Link
            key={link.to}
            to={link.to}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '12px 8px',
              textDecoration: 'none',
              color: active ? 'var(--color-primary)' : 'var(--color-gray-500)',
              flex: 1
            }}
          >
            <Icon size={24} color={active ? 'var(--color-primary)' : 'var(--color-gray-400)'} />
            <span style={{ fontSize: '11px', fontWeight: active ? 600 : 500 }}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
