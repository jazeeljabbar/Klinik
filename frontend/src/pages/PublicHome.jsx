import HeroSection from '../components/HeroSection';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PublicHome() {
  const navigate = useNavigate();

  return (
    <>
      <HeroSection onImageSelect={(file, source = 'gallery') => {
        navigate('/scan', { state: { initialFile: file, initialSource: source } });
      }} />

      {/* Your skin, over time section */}
      <section style={{
        background: 'var(--color-navy-deep)',
        padding: '72px 24px',
        color: '#FFFFFF',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.06)',
            marginBottom: '20px'
          }}>
            <CalendarDays size={26} color="var(--color-mint-success)" />
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.01em' }}>
            Your skin, over time
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: 'var(--color-gray-300)',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 36px'
          }}>
            Upload photos, monitor changes over time, and stay consistent with your skincare routine.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/signup"
              style={{
                background: '#FFFFFF',
                color: 'var(--color-navy-deep)',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s'
              }}
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/how-it-works"
              style={{
                background: 'transparent',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '14px 28px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
