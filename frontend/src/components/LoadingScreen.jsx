import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-strong"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        border: 'none',
        borderRadius: 0,
      }}
    >
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
    </motion.div>
  );
}
