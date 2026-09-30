import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Calendar, AlertCircle, ChevronRight, RefreshCw, XCircle, Info, X, Trash2 } from 'lucide-react';
import { getHistory, deleteHistory } from '../utils/api';
import ResultsDashboard from '../components/ResultsDashboard';

const MAPPED_LABELS = {
  'Mild Acne': 'Lower visible breakout level',
  'Moderate Acne': 'Moderate visible breakout level',
  'Severe Acne': 'Higher visible breakout level',
  'Very Severe Acne': 'Very high visible breakout level',
};

const mapLabel = (rawLabel) => MAPPED_LABELS[rawLabel] || rawLabel;

import AuthenticatedImage from '../components/AuthenticatedImage';

export default function SkinCheckIns() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScan, setSelectedScan] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchScans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHistory();
      setScans(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadScans = async () => {
      try {
        const data = await getHistory();
        if (isMounted) {
          setScans(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load check-ins');
        }
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

  const handleDelete = async (scanId) => {
    if (!window.confirm("Are you sure you want to delete this scan? This action cannot be undone.")) return;
    try {
      setIsDeleting(true);
      await deleteHistory(scanId);
      setScans(prev => prev.filter(s => s.id !== scanId));
      setSelectedScan(null);
    } catch (err) {
      alert("Failed to delete scan: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--color-navy-deep)' }}>
        <RefreshCw className="spin" size={32} style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
        <p>Loading your check-ins...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5', color: '#991B1B', display: 'flex', gap: '12px' }}>
        <XCircle size={24} style={{ flexShrink: 0 }} />
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Error Loading Check-ins</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          <button onClick={fetchScans} style={{ marginTop: '12px', padding: '8px 16px', background: '#991B1B', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Try Again</button>
        </div>
      </div>
    );
  }

  const latestScan = scans.length > 0 ? scans[0] : null;
  const recentScans = scans.slice(1);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-navy-deep)', margin: '0 0 8px 0' }}>Skin Check-ins</h1>
          <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Your saved skin checks in one private place.</p>
        </div>
        <Link to="/scan" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-navy-deep)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.95rem'
        }}>
          <Camera size={18} />
          New Skin Check
        </Link>
      </div>

      {scans.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid var(--color-gray-200)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <Camera size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 12px 0' }}>You have not saved any skin checks yet.</h3>
          <p style={{ color: 'var(--color-gray-600)', margin: '0 0 24px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Take a clear photo to save your first image-based analysis.
          </p>
          <Link to="/scan" style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Start a Skin Check
          </Link>
        </div>
      ) : (
        <>
          {scans.length === 1 && (
            <div style={{
              background: 'rgba(34, 198, 142, 0.1)',
              border: '1px solid rgba(34, 198, 142, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '32px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <Info size={24} color="var(--color-mint-success)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, color: 'var(--color-navy-deep)', fontWeight: 500 }}>You have saved your first skin check-in.</p>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>Add another check-in whenever you are ready.</p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
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
                <button onClick={() => setSelectedScan(latestScan)} style={{
                  background: 'transparent',
                  border: '1px solid var(--color-gray-300)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: 'var(--color-navy-deep)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  alignSelf: 'flex-start',
                  cursor: 'pointer'
                }}>
                  View check-in details
                </button>
              </div>
            </div>
          </div>

          {recentScans.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 16px 0' }}>Recent Check-ins</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentScans.map((scan) => (
                  <div key={scan.id} style={{
                    background: '#fff',
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', flexShrink: 0 }}>
                      <AuthenticatedImage scan={scan} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray-500)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <Calendar size={12} />
                        {formatDate(scan.timestamp)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-mint-success)', fontSize: '0.85rem' }}>Check-in completed</span>
                        {scan.simulated_analysis && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                            Simulated Demo
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-navy-deep)', fontSize: '1.05rem' }}>
                        {mapLabel(scan.predicted_class)}
                      </div>
                      
                      {scan.comparison_eligible === false && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: '#FFFBEB', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
                          <AlertCircle size={14} color="#92400e" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>Quality note</div>
                            <div style={{ fontSize: '0.75rem', color: '#A16207', marginTop: '2px', lineHeight: 1.4 }}>
                              {scan.quality_flags && scan.quality_flags.length > 0 ? (
                                scan.quality_flags.map((flag, i) => (
                                  <span key={i}>
                                    {i > 0 && ', '}
                                    {flag === 'low_resolution'
                                      ? (scan.image_dimensions
                                          ? `Image resolution ${scan.image_dimensions.width}×${scan.image_dimensions.height}px (below 800px application requirement, not clinically validated)`
                                          : 'Image below 800px (application requirement, not clinically validated)')
                                      : flag === 'partial_face'
                                      ? 'Partial face framing detected'
                                      : flag === 'blur'
                                      ? 'Photo may be unclear'
                                      : flag === 'low_light'
                                      ? 'Photo may be too dark'
                                      : flag === 'overexposed'
                                      ? 'Photo may be too bright'
                                      : flag === 'no_face'
                                      ? 'Face not detected'
                                      : flag.replace('_', ' ')}
                                  </span>
                                ))
                              ) : (
                                'Lighting, clarity, or framing may affect comparison reliability.'
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button onClick={() => setSelectedScan(scan)} style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      padding: '8px'
                    }}>
                      <span className="desktop-only-inline">View details</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to="/scan" style={{
                  display: 'inline-block',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}>
                  Add another check-in
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Overlay for Scan Details */}
      <AnimatePresence>
        {selectedScan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.6)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
            onClick={() => setSelectedScan(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              <button 
                onClick={() => setSelectedScan(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'var(--color-gray-100)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <X size={18} color="var(--color-navy-deep)" />
              </button>

              {/* Render Image at the top of modal */}
              <div style={{ width: '100%', height: '240px', background: '#f8fafc', position: 'relative' }}>
                <AuthenticatedImage scan={selectedScan} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ padding: '24px 16px' }}>
                <ResultsDashboard results={selectedScan} />
                
                <div style={{ marginTop: '32px', borderTop: '1px solid var(--color-gray-200)', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleDelete(selectedScan.id)}
                    disabled={isDeleting}
                    style={{
                      background: 'transparent',
                      border: '1px solid #FCA5A5',
                      color: '#DC2626',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    <Trash2 size={18} />
                    {isDeleting ? 'Deleting...' : 'Delete Scan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
