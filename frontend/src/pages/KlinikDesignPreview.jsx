import React, { useState } from 'react';
import { ScanLine, Crosshair, Camera, ImagePlus, Sparkles, ChartNoAxesCombined, CalendarDays, ShieldCheck, Heart, CircleCheck, TriangleAlert } from 'lucide-react';

export default function KlinikDesignPreview() {
  const [activeTab, setActiveTab] = useState('desktop');

  const strongGlassStyle = {
    background: 'rgba(255, 255, 255, 0.68)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.65)',
    boxShadow: '0 8px 16px -4px rgba(13, 27, 62, 0.08)',
    borderRadius: '16px',
  };

  const subtleCardStyle = {
    background: '#ffffff',
    border: '1px solid var(--color-gray-200)',
    boxShadow: '0 2px 4px -1px rgba(13, 27, 62, 0.03)',
    borderRadius: '12px',
  };

  const glassNavStyle = {
    background: 'rgba(255, 255, 255, 0.84)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
  };

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Controller for Preview */}
      <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, position: 'relative' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>Klinik Design Preview v3 (Navy Storytelling)</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('desktop')}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '6px', 
              background: activeTab === 'desktop' ? '#1B2559' : '#F3F4F6',
              color: activeTab === 'desktop' ? '#fff' : '#4B5563',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}>
            Desktop (1440x900)
          </button>
          <button 
            onClick={() => setActiveTab('mobile')}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '6px', 
              background: activeTab === 'mobile' ? '#1B2559' : '#F3F4F6',
              color: activeTab === 'mobile' ? '#fff' : '#4B5563',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}>
            Mobile (390x844)
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '32px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start',
      }}>
        {/* Container for the preview frame */}
        <div style={{
          width: activeTab === 'desktop' ? '1440px' : '390px',
          height: activeTab === 'desktop' ? '900px' : '844px',
          background: 'var(--color-surface)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid #e2e8f0',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Atmospheric background blobs for Hero area only */}
          <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(232,99,74,0.06) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(46,58,110,0.05) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', top: '25%', left: '10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(34,198,142,0.04) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

          {/* Navbar */}
          <nav style={{ 
            height: '72px', 
            padding: '0 24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            ...glassNavStyle
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/klinik-logo.svg" alt="Klinik Logo" style={{ height: activeTab === 'desktop' ? '36px' : '32px' }} />
            </div>
            {activeTab === 'desktop' && (
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <a href="#about" style={{ textDecoration: 'none', color: 'var(--color-navy-deep)', fontWeight: 500, fontSize: '15px' }}>About</a>
                <a href="#how" style={{ textDecoration: 'none', color: 'var(--color-navy-deep)', fontWeight: 500, fontSize: '15px' }}>How It Works</a>
                <a href="#contact" style={{ textDecoration: 'none', color: 'var(--color-navy-deep)', fontWeight: 500, fontSize: '15px' }}>Contact</a>
                <div style={{ width: '1px', height: '24px', background: 'rgba(27,37,89,0.1)' }}></div>
                <a href="#login" style={{ textDecoration: 'none', color: 'var(--color-navy-deep)', fontWeight: 600, fontSize: '15px' }}>Log In</a>
                <button style={{ 
                  background: 'var(--color-navy-deep)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 24px', 
                  borderRadius: '12px', 
                  fontWeight: 600, 
                  fontSize: '15px',
                  cursor: 'pointer',
                }}>
                  Sign Up
                </button>
              </div>
            )}
            {activeTab === 'mobile' && (
              <div style={{ color: 'var(--color-navy-deep)', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </div>
            )}
          </nav>

          <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            
            {/* HERO SECTION */}
            <div style={{ padding: activeTab === 'desktop' ? '64px 24px 80px' : '40px 16px 64px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: activeTab === 'desktop' ? 'row' : 'column', alignItems: 'center', gap: activeTab === 'desktop' ? '48px' : '32px' }}>
              <div style={{ flex: 1, textAlign: activeTab === 'desktop' ? 'left' : 'center', zIndex: 2 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(13,27,62,0.05)', marginBottom: '16px', color: 'var(--color-navy-deep)', fontSize: '13px', fontWeight: 600 }}>
                  <Sparkles size={16} color="var(--color-coral-accent)" />
                  AI-Powered Insights
                </div>
                <h1 style={{ 
                  fontSize: activeTab === 'desktop' ? '46px' : '36px', 
                  fontWeight: 700, 
                  color: 'var(--color-navy-deep)', 
                  marginBottom: '16px',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em'
                }}>
                  Understand your skin's unique story.
                </h1>
                <p style={{ 
                  fontSize: activeTab === 'desktop' ? '18px' : '16px', 
                  color: 'var(--color-gray-600)', 
                  marginBottom: '32px',
                  lineHeight: 1.6
                }}>
                  A quick, guided scan to help you track your progress and build a better routine, step by step.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: activeTab === 'desktop' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
                  <button style={{
                    background: 'var(--color-navy-deep)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <ScanLine size={18} />
                    Start Scan
                  </button>
                  <button style={{
                    background: 'transparent',
                    color: 'var(--color-navy-deep)',
                    border: '1px solid var(--color-navy-deep)',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <ImagePlus size={18} />
                    Upload Photo
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                {/* Hero Illustration */}
                <div style={{ ...strongGlassStyle, padding: '8px', width: '100%', maxWidth: '400px', position: 'relative' }}>
                  <div style={{ 
                    borderRadius: '12px', 
                    height: '280px', 
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' // Fallback
                  }}>
                    {/* TODO: Replaceable hero asset */}
                    <img src="/hero-illustration.png" alt="Klinik guided skin scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', ...strongGlassStyle, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
                    <div style={{ width: '8px', height: '8px', background: 'var(--color-mint-success)', borderRadius: '50%', boxShadow: '0 0 6px var(--color-mint-success)' }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Ready to scan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DARK SECTION 1: How Klinik Works (Storytelling Anchor) */}
            <div style={{ background: 'var(--color-navy-deep)', padding: activeTab === 'desktop' ? '80px 24px' : '64px 16px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '48px' }}>How Klinik works</h2>
                <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'desktop' ? 'repeat(3, 1fr)' : '1fr', gap: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={24} color="#fff" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>1. Capture</h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-gray-400)', margin: 0, lineHeight: 1.5 }}>Take a clear selfie using our guided camera overlay.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={24} color="var(--color-mint-success)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>2. Understand</h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-gray-400)', margin: 0, lineHeight: 1.5 }}>Our AI identifies key areas and provides an objective severity score.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChartNoAxesCombined size={24} color="var(--color-coral-accent)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>3. Track</h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-gray-400)', margin: 0, lineHeight: 1.5 }}>Monitor changes over time to see how your routine is working.</p>
                  </div>
                </div>
              </div>
              {/* Subtle background graphic */}
              <div style={{ position: 'absolute', right: '-10%', bottom: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(232,99,74,0.1) 0%, rgba(255,255,255,0) 70%)' }}></div>
            </div>

            {/* UI STATE PREVIEWS (Light Surface) */}
            <div style={{ padding: activeTab === 'desktop' ? '80px 24px' : '48px 16px', maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '64px' }}>
              
              <div style={{ textAlign: 'center', marginBottom: '-24px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UI State Demos</span>
              </div>

              {/* Analyzing State (Strong Glass Overlay) */}
              <div style={{
                ...strongGlassStyle,
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
              }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Subtle coral glow at center */}
                  <div style={{ position: 'absolute', width: '40px', height: '40px', background: 'var(--color-coral-accent)', filter: 'blur(20px)', opacity: 0.25, borderRadius: '50%' }}></div>
                  <Crosshair size={40} color="var(--color-navy-deep)" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                  <style>{`
                    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
                  `}</style>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 8px 0' }}>Looking closely at your skin...</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', margin: 0 }}>Preparing your personalised skin analysis.</p>
                </div>
              </div>

              {/* Results State (Subtle Cards) */}
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px', textAlign: 'center' }}>Your analysis is ready</h2>
                <p style={{ fontSize: '15px', color: 'var(--color-gray-600)', marginBottom: '32px', textAlign: 'center' }}>Here’s what our assessment found today.</p>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: activeTab === 'desktop' ? 'repeat(3, 1fr)' : '1fr', 
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  {/* Result Card 1 */}
                  <div style={{ ...subtleCardStyle, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-navy-deep)' }}>
                      <ScanLine size={18} />
                      <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Condition</div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>Severe Acne</div>
                  </div>

                  {/* Result Card 2 */}
                  <div style={{ ...subtleCardStyle, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-navy-deep)' }}>
                      <CircleCheck size={18} />
                      <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>84%</div>
                  </div>

                  {/* Result Card 3 */}
                  <div style={{ ...subtleCardStyle, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-navy-deep)' }}>
                      <Crosshair size={18} />
                      <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity Level</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-coral-accent)' }}></div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>High</div>
                    </div>
                  </div>
                </div>

                {/* Severity Meter (Subtle Card) */}
                <div style={{ ...subtleCardStyle, padding: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <ChartNoAxesCombined size={18} color="var(--color-navy-deep)" />
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-navy-deep)', margin: 0 }}>Overall Severity</h3>
                  </div>
                  <div style={{ padding: '0 8px' }}>
                    <div style={{ 
                      height: '6px', 
                      borderRadius: '3px', 
                      background: 'linear-gradient(to right, var(--color-mint-success) 0%, rgba(34, 198, 142, 0.4) 30%, rgba(232, 99, 74, 0.4) 70%, var(--color-coral-accent) 100%)',
                      position: 'relative',
                      marginBottom: '12px'
                    }}>
                      <div style={{ width: '16px', height: '16px', background: '#fff', border: '3px solid var(--color-coral-accent)', borderRadius: '50%', position: 'absolute', top: '50%', left: '80%', transform: 'translate(-50%, -50%)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500 }}>
                      <span style={{ color: 'var(--color-gray-600)' }}>Clear</span>
                      <span style={{ color: 'var(--color-gray-600)' }}>Moderate</span>
                      <span style={{ color: 'var(--color-coral-accent)' }}>Severe</span>
                    </div>
                  </div>
                </div>

                {/* Recommendation Card */}
                <div style={{ ...subtleCardStyle, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(232, 99, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-coral-accent)' }}>
                      <Heart size={18} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-navy-deep)', margin: 0 }}>Care Recommendation</h3>
                  </div>
                  <div style={{ color: 'var(--color-navy-deep)', fontSize: '15px', lineHeight: 1.6 }}>
                    Your result suggests that professional dermatology guidance may be helpful. A personalized routine guided by an expert can support your skin's health optimally.
                  </div>
                </div>

              </div>

            </div>

            {/* DARK SECTION 2: Trust / Progress Section */}
            <div style={{ background: 'var(--color-navy-deep)', padding: activeTab === 'desktop' ? '64px 24px' : '48px 16px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>
              
              {/* Your skin, over time */}
              <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                <CalendarDays size={28} color="var(--color-mint-success)" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Your skin, over time</h2>
                <p style={{ fontSize: '15px', color: 'var(--color-gray-400)', marginBottom: '32px', lineHeight: 1.6 }}>Upload photos, monitor changes over time, and stay consistent with your skincare routine.</p>
                {/* Mock abstract graph on dark bg */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', height: '120px', position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '16px', gap: '8px', justifyContent: 'space-between' }}>
                  {[40, 60, 45, 80, 50, 30].map((h, i) => (
                    <div key={i} style={{ width: '12%', height: `${h}%`, background: h > 60 ? 'var(--color-coral-accent)' : 'var(--color-mint-success)', borderRadius: '4px', opacity: 0.8 }}></div>
                  ))}
                </div>
              </div>

              {/* Privacy / Trust Card */}
              <div style={{ maxWidth: '600px', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <ShieldCheck size={24} color="var(--color-mint-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Your images stay private and protected</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-gray-400)', margin: 0, lineHeight: 1.5 }}>We use your data only to provide your assessment and securely track your history. We never share your photos.</p>
                </div>
              </div>

            </div>

            {/* Disclaimer */}
            <div style={{ padding: '32px 24px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: '800px', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px', border: '1px solid var(--color-gray-200)', borderRadius: '12px', background: '#fff' }}>
                <TriangleAlert size={20} color="var(--color-gray-400)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: 'var(--color-gray-600)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Educational tool only.</strong> This assessment does not provide medical advice or diagnosis. Always consult a healthcare professional for clinical evaluation.
                </p>
              </div>
            </div>

          </main>

          {/* Footer (Dark Strip) */}
          <footer style={{
            background: 'var(--color-navy-deep)',
            padding: '24px',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ 
              maxWidth: '880px', 
              margin: '0 auto', 
              display: 'flex', 
              flexDirection: activeTab === 'desktop' ? 'row' : 'column',
              justifyContent: 'space-between', 
              alignItems: activeTab === 'desktop' ? 'center' : 'center',
              gap: '16px'
            }}>
              <img src="/klinik-logo.svg" alt="Klinik Logo" style={{ height: '24px', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
              
              <div style={{ fontSize: '13px', color: 'var(--color-gray-400)', display: 'flex', gap: '24px', alignItems: 'center' }}>
                <span>&copy; 2026 Klinik. All rights reserved.</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Privacy</a>
                  <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Terms</a>
                </div>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
