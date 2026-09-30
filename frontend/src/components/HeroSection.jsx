import { useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, ImagePlus } from 'lucide-react';
import CameraModal from './CameraModal';

export default function HeroSection({ onImageSelect }) {
  const [dragOver, setDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file, 'gallery');
    }
  }, [onImageSelect]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      onImageSelect(file, 'gallery');
    }
  }, [onImageSelect]);

  return (
    <section style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: '92px',
      paddingBottom: '80px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmospheric background blobs */}
      <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(232,99,74,0.06) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(46,58,110,0.05) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '25%', left: '10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(34,198,142,0.04) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1000px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>
          {/* Left Column: Text and Upload */}
          <div style={{ textAlign: 'left', zIndex: 2 }}>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: '16px',
                color: 'var(--color-navy-deep)',
                letterSpacing: '-0.02em'
              }}
            >
              Understand your skin's unique story.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                color: 'var(--color-gray-600)',
                maxWidth: '500px',
                margin: '0 0 32px 0',
                lineHeight: 1.6,
              }}
            >
              A quick, guided scan to help you track your progress and build a better routine, step by step.
            </motion.p>

            {/* Upload Area */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ maxWidth: '560px' }}
            >
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
              >
                <button
                  onClick={() => setIsCameraOpen(true)}
                  style={{
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
                    boxShadow: '0 4px 12px rgba(13, 27, 62, 0.15)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <ScanLine size={18} />
                  Start Scan
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: dragOver ? 'rgba(13, 27, 62, 0.05)' : 'transparent',
                    color: 'var(--color-navy-deep)',
                    border: '1px solid var(--color-navy-deep)',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(13, 27, 62, 0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = dragOver ? 'rgba(13, 27, 62, 0.05)' : 'transparent'}
                >
                  <ImagePlus size={18} />
                  Upload Photo
                </button>
              </div>
              <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
                {dragOver ? 'Drop file to upload' : 'You can also drag and drop an image here.'}
              </p>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="hero-file-input"
              />
            </motion.div>
          </div> {/* End Left Column */}

          {/* Right Column: Hero Visual - Illustrative Skin Progress Over Time */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
          >
            <div className="glass-strong" style={{
              padding: '24px',
              width: '100%',
              maxWidth: '430px',
              borderRadius: '24px',
              boxShadow: '0 20px 40px -15px rgba(13, 27, 62, 0.12)',
              border: '1px solid rgba(27, 37, 89, 0.08)',
              background: '#FFFFFF'
            }}>
              {/* Header inside visual card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>Your Progress</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>Monitoring gradual skin changes</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 198, 142, 0.12)', padding: '4px 10px', borderRadius: '12px' }}>
                  <div style={{ width: '7px', height: '7px', background: 'var(--color-mint-success)', borderRadius: '50%' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-mint-success)' }}>Active Tracking</span>
                </div>
              </div>

              {/* Side-by-Side Progression Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
                {/* Baseline Scan */}
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-gray-600)', marginBottom: '8px' }}>Baseline Scan</div>
                  <div style={{
                    height: '110px',
                    borderRadius: '10px',
                    background: 'linear-gradient(180deg, #F1F5F9 0%, #E2E8F0 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Illustrative face reticle */}
                    <div style={{ width: '48px', height: '62px', border: '2px solid #94A3B8', borderRadius: '24px 24px 30px 30px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '6px', height: '6px', background: '#E8634A', borderRadius: '50%', position: 'absolute', top: '24px', left: '12px', opacity: 0.85 }}></div>
                      <div style={{ width: '5px', height: '5px', background: '#E8634A', borderRadius: '50%', position: 'absolute', top: '34px', right: '14px', opacity: 0.85 }}></div>
                      <div style={{ width: '4px', height: '4px', background: '#E8634A', borderRadius: '50%', position: 'absolute', top: '42px', left: '20px', opacity: 0.85 }}></div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Initial Check</div>
                </div>

                {/* Transition Indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(232, 99, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-coral-accent)', fontSize: '13px', fontWeight: 700 }}>
                    →
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-gray-400)', fontWeight: 500 }}>Routine</span>
                </div>

                {/* Check-in Scan */}
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-gray-600)', marginBottom: '8px' }}>Follow-up Scan</div>
                  <div style={{
                    height: '110px',
                    borderRadius: '10px',
                    background: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Illustrative face reticle showing calm skin */}
                    <div style={{ width: '48px', height: '62px', border: '2px solid #22C68E', borderRadius: '24px 24px 30px 30px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '4px', height: '4px', background: '#22C68E', borderRadius: '50%', position: 'absolute', top: '28px', left: '18px', opacity: 0.7 }}></div>
                      <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '16px', height: '16px', background: '#22C68E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>✓</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-mint-success)' }}>Recent Check</div>
                </div>
              </div>

              {/* Progress Timeline Nodes */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Scan Timeline</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>Chronological Check-ins</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: '4px 0' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '12px', right: '12px', height: '2px', background: '#CBD5E1', transform: 'translateY(-50%)', zIndex: 0 }}></div>
                  <div style={{ position: 'absolute', top: '50%', left: '12px', width: '50%', height: '2px', background: 'var(--color-mint-success)', transform: 'translateY(-50%)', zIndex: 0 }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-navy-deep)', border: '2px solid #fff', margin: '0 auto 3px' }}></div>
                      <div style={{ fontSize: '10px', color: 'var(--color-navy-deep)', fontWeight: 600 }}>Scan 1</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-mint-success)', border: '2px solid #fff', margin: '0 auto 3px' }}></div>
                      <div style={{ fontSize: '10px', color: 'var(--color-mint-success)', fontWeight: 600 }}>Scan 2</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#CBD5E1', border: '2px solid #fff', margin: '0 auto 3px' }}></div>
                      <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', fontWeight: 500 }}>Next</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--color-gray-600)' }}>
                Track changes across scans to stay consistent with your routine.
              </div>
            </div>
          </motion.div>
        </div> {/* End Grid */}
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={(file) => {
          setIsCameraOpen(false);
          onImageSelect(file, 'camera');
        }}
      />
    </section>
  );
}
