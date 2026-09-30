import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, Calendar, RefreshCw } from 'lucide-react';
import { getHistory } from '../utils/api';
import AuthenticatedImage from '../components/AuthenticatedImage';

const MAPPED_LABELS = {
  'Mild Acne': 'Lower visible breakout level',
  'Moderate Acne': 'Moderate visible breakout level',
  'Severe Acne': 'Higher visible breakout level',
  'Very Severe Acne': 'Very high visible breakout level',
};

const mapLabel = (rawLabel) => MAPPED_LABELS[rawLabel] || rawLabel;

export default function AuthHome() {
  const [latestScan, setLatestScan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadScans = async () => {
      try {
        const data = await getHistory();
        if (isMounted && data && data.length > 0) {
          setLatestScan(data[0]);
        }
      } catch (err) {
        console.error('Failed to load check-ins', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadScans();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Dashboard Greeting */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px' }}>
          My Skin
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-gray-600)' }}>
          Start a new skin check or review your saved check-ins.
        </p>
      </div>

      {/* Primary Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        <Link to="/scan" style={{
          background: 'var(--color-navy-deep)',
          color: '#fff',
          padding: '24px',
          borderRadius: '20px',
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(13, 27, 62, 0.15)',
          transition: 'transform 0.2s ease'
        }}>
          <Camera size={32} />
          <div style={{ fontSize: '18px', fontWeight: 600 }}>New Skin Check</div>
        </Link>
        
        <Link to="/skin-check-ins" style={{
          background: '#fff',
          color: 'var(--color-navy-deep)',
          border: '2px solid var(--color-slate-200)',
          padding: '24px',
          borderRadius: '20px',
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          transition: 'border-color 0.2s ease'
        }}>
          <Clock size={32} color="var(--color-gray-500)" />
          <div style={{ fontSize: '18px', fontWeight: 600 }}>View Check-ins</div>
        </Link>
      </div>

      {/* Latest Check-in Section */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw className="spin" size={24} color="var(--color-gray-400)" />
        </div>
      ) : latestScan ? (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 16px 0' }}>Latest Check-in</h2>
          <div className="responsive-split-card" style={{
            background: '#fff',
            border: '1px solid var(--color-gray-200)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <div style={{ width: '100%', maxWidth: '280px', height: '200px', background: '#f8fafc', position: 'relative', borderRight: '1px solid var(--color-gray-200)' }}>
              <AuthenticatedImage scan={latestScan} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray-500)', fontSize: '0.9rem', marginBottom: '8px' }}>
                <Calendar size={14} />
                {formatDate(latestScan.timestamp)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-mint-success)' }}>Check-in completed</span>
                {latestScan.simulated_analysis && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                    Simulated Demo
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '16px' }}>
                {mapLabel(latestScan.predicted_class)}
              </div>
              <Link to="/skin-check-ins" style={{
                display: 'inline-block',
                background: 'transparent',
                border: '1px solid var(--color-gray-300)',
                padding: '8px 16px',
                borderRadius: '6px',
                color: 'var(--color-navy-deep)',
                fontWeight: 500,
                fontSize: '0.9rem',
                alignSelf: 'flex-start',
                textDecoration: 'none'
              }}>
                View check-in details
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          border: '1px solid var(--color-gray-200)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Camera size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 8px 0' }}>No check-ins yet</h3>
          <p style={{ color: 'var(--color-gray-600)', margin: '0', fontSize: '0.95rem' }}>
            Take a clear photo to save your first image-based analysis.
          </p>
        </div>
      )}

    </div>
  );
}
