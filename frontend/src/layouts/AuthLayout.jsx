import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import BottomNav from '../components/BottomNav';
import ConsentModal from '../components/ConsentModal';
import { useAuth } from '../context/AuthContext';

export default function AuthLayout({ children }) {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-slate-50)' }}>
      {/* Desktop Sidebar */}
      <div className="desktop-only-block" style={{ width: '260px', flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
        <TopHeader />
        
        <main style={{ flex: 1, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 24px))', overflowY: 'auto' }}>
          {children || <Outlet />}
        </main>
        
        <BottomNav />
      </div>

      {/* One-time Consent Onboarding Gate */}
      <ConsentModal isOpen={!!user?.consent_required} />
    </div>
  );
}
