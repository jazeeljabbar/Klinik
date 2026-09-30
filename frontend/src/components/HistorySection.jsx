import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getHistory } from '../utils/api';
import { getDisplayLabel } from '../utils/labels';
import AuthenticatedImage from './AuthenticatedImage';

export default function HistorySection({ refreshTrigger }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setHistory([]);
      setLoading(false);
      return;
    }

    getHistory()
      .then(data => {
        setHistory(data || []);
      })
      .catch(err => {
        console.error("Failed to fetch history:", err);
        setHistory([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshTrigger]);

  const formatDate = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (loading) return null; // Or a small skeleton loader

  const hasScans = history.length > 0;
  const latestScan = hasScans ? history[0] : null;

  return (
    <div style={{ background: 'var(--color-navy-deep)', padding: '64px 16px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '64px' }}>
      
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', marginBottom: '24px' }}>
          <Sparkles size={24} color="#FACC15" />
        </div>

        {hasScans ? (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Your Skin Journey</h2>
            <p style={{ fontSize: '16px', color: 'var(--color-gray-400)', marginBottom: '32px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 32px' }}>
              Upload photos, monitor changes over time, and stay consistent with your skincare routine.
            </p>
            
            {/* Latest Scan Summary */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              marginBottom: '32px'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AuthenticatedImage scan={latestScan} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--color-gray-400)', marginBottom: '4px' }}>Latest Check-in • {formatDate(latestScan.timestamp)}</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{getDisplayLabel(latestScan.predicted_class)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <Link to="/skin-journey" style={{ 
                background: '#fff', 
                color: 'var(--color-navy-deep)', 
                padding: '14px 32px', 
                borderRadius: '12px', 
                fontWeight: 600, 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}>
                View My Skin Journey
                <ArrowRight size={18} />
              </Link>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'transparent', border: 'none', color: '#fff', padding: '12px 24px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                Add a New Scan
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Your skin journey starts with your first scan</h2>
            <p style={{ fontSize: '16px', color: 'var(--color-gray-400)', marginBottom: '40px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 40px' }}>
              Upload photos, monitor changes over time, and stay consistent with your skincare routine.
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ 
                background: '#fff', 
                color: 'var(--color-navy-deep)', 
                padding: '14px 32px', 
                borderRadius: '12px', 
                fontWeight: 600, 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Start My First Scan
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
