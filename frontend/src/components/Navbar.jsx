import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { logout } from '../utils/api';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/skin-journey', label: 'Skin Journey' },
    { to: '/about', label: 'About' },
    { to: '/how-it-works', label: 'How It Works' },
  ];

  return (
    <nav
      className={scrolled ? 'glass-nav' : ''}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(255,255,255,0.84)' : 'transparent',
      }}
    >
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src="/klinik-logo-wordmark.png" 
              alt="Klinik Logo" 
              className="navbar-logo"
              style={{ display: 'block', height: '36px', width: 'auto' }} 
              onError={(e) => { e.target.src = '/klinik-logo-vector.svg'; }}
            />
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                textDecoration: 'none',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: 500,
                transition: 'all 0.3s ease',
                color: location.pathname === link.to ? 'var(--color-navy-deep)' : 'var(--color-gray-600)',
                background: location.pathname === link.to ? 'rgba(13, 27, 62, 0.04)' : 'transparent',
              }}
              onMouseOver={(e) => {
                if (location.pathname !== link.to) {
                  e.target.style.color = 'var(--color-navy-deep)';
                  e.target.style.background = 'rgba(13, 27, 62, 0.04)';
                }
              }}
              onMouseOut={(e) => {
                if (location.pathname !== link.to) {
                  e.target.style.color = 'var(--color-gray-600)';
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ width: '1px', height: '24px', background: 'rgba(27,37,89,0.1)', margin: '0 8px' }} />
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-navy-deep)' }}>
                Hi, {user?.name?.split(' ')[0] || 'User'}
              </span>
              <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--color-gray-200)', borderRadius: '12px', padding: '10px 24px', fontSize: '15px', fontWeight: 600, color: 'var(--color-navy-deep)', cursor: 'pointer' }}>
                Log Out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', padding: '10px 24px', fontSize: '15px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>
                Log In
              </Link>
              <Link to="/signup" style={{ background: 'var(--color-navy-deep)', color: 'white', textDecoration: 'none', padding: '10px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--color-navy-deep)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
          }}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(226,232,240,0.5)',
            }}
          >
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.to}
                    style={{
                      textDecoration: 'none',
                      display: 'block',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: location.pathname === link.to ? 'var(--color-navy-deep)' : 'var(--color-gray-600)',
                      background: location.pathname === link.to ? 'rgba(13, 27, 62, 0.04)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <div style={{ height: '1px', background: 'rgba(27,37,89,0.1)', margin: '8px 0' }} />
                {token ? (
                  <button onClick={() => { handleLogout(); setIsOpen(false); }} style={{ width: '100%', background: 'none', border: '1px solid var(--color-gray-200)', borderRadius: '12px', padding: '12px', marginTop: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--color-navy-deep)', cursor: 'pointer' }}>
                    Log Out
                  </button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', display: 'block', padding: '12px 16px', color: 'var(--color-navy-deep)', fontWeight: 600, textAlign: 'center' }}>
                      Log In
                    </Link>
                    <Link to="/signup" onClick={() => setIsOpen(false)} style={{ background: 'var(--color-navy-deep)', color: 'white', textDecoration: 'none', display: 'block', padding: '12px 16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, textAlign: 'center', marginTop: '8px' }}>
                      Sign Up
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .navbar-logo {
          width: 125px;
          height: auto;
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .navbar-logo { width: 110px; }
        }
      `}</style>
    </nav>
  );
}
