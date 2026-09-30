import React from 'react';

export default function BrandPreview() {
  return (
    <div style={{ padding: '40px', background: 'var(--color-surface)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Logo Variants */}
        <section className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '20px' }}>Logo Variants</h2>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ padding: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
              <img src="/klinik-logo.svg" alt="Klinik Light" style={{ height: '40px' }} />
            </div>
            <div style={{ padding: '24px', background: 'var(--color-primary-dark)', borderRadius: '16px' }}>
              {/* For dark background, we might need a white logo, but for now we'll just show how the logo looks on dark */}
              <img src="/klinik-logo.svg" alt="Klinik Dark" style={{ height: '40px' }} />
            </div>
          </div>
        </section>

        {/* Typography Scale */}
        <section className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '20px' }}>Typography Scale (Inter)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heading 1 / 700 Weight</span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary-dark)', margin: 0 }}>Clinical precision.</h1>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heading 2 / 700 Weight</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', margin: 0 }}>Human warmth.</h2>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body / 400 Weight</span>
              <p style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text)', margin: 0 }}>Your analysis is ready — here's what we found. This text provides clear, educational information without causing alarm.</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label / 600 Weight</span>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary-dark)', margin: 0 }}>Email Address</label>
            </div>
          </div>
        </section>

        {/* Button Hierarchy */}
        <section className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '20px' }}>Button Hierarchy</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ background: 'var(--color-primary)', borderRadius: '12px', padding: '12px 24px', boxShadow: 'none' }}>Primary Action</button>
            <button className="btn-secondary" style={{ borderRadius: '12px', padding: '12px 24px' }}>Secondary Action</button>
            <button style={{ background: 'var(--color-accent)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 500, fontSize: '1.05rem' }}>Accent CTA</button>
          </div>
        </section>

        {/* Severity Meter & Disclaimer */}
        <section className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '20px' }}>Components</h2>
          
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-secondary)' }}>Severity Meter</h3>
            <div className="severity-meter">
              <div className="severity-meter-indicator" style={{ left: '50%' }} />
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
