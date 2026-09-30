import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Calendar, ArrowLeftRight, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { getHistory } from '../utils/api';
import { getDisplayLabel } from '../utils/labels';
import AuthenticatedImage from '../components/AuthenticatedImage';

export default function SkinJourney() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanAId, setScanAId] = useState(null);
  const [scanBId, setScanBId] = useState(null);

  const selectInitialPair = (sortedList) => {
    if (!sortedList || sortedList.length === 0) return;
    const eligible = sortedList.filter(s => s.comparison_eligible !== false);
    if (eligible.length >= 2) {
      setScanAId(eligible[0].id);
      setScanBId(eligible[eligible.length - 1].id);
    } else if (sortedList.length >= 2) {
      setScanAId(sortedList[0].id);
      setScanBId(sortedList[sortedList.length - 1].id);
    } else if (sortedList.length === 1) {
      setScanAId(sortedList[0].id);
    }
  };

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHistory();
      const sorted = (data || []).slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setScans(sorted);
      selectInitialPair(sorted);
    } catch (err) {
      console.error("Failed to load scans for journey:", err);
      setError(err.message || "Failed to load check-ins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getHistory()
      .then((data) => {
        if (!isMounted) return;
        const sorted = (data || []).slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setScans(sorted);
        selectInitialPair(sorted);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load scans for journey:", err);
        setError(err.message || "Failed to load check-ins.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysBetween = (earlierDate, laterDate) => {
    const d1 = new Date(earlierDate).getTime();
    const d2 = new Date(laterDate).getTime();
    if (isNaN(d1) || isNaN(d2) || d2 <= d1) return 0;
    const diffTime = d2 - d1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const scanA = scans.find(s => s.id === scanAId) || (scans.length > 0 ? scans[0] : null);
  const scanB = scans.find(s => s.id === scanBId) || (scans.length > 1 ? scans[scans.length - 1] : null);

  const isSameScan = Boolean(scanA && scanB && scanA.id === scanB.id);
  const timeA = scanA ? new Date(scanA.timestamp).getTime() : 0;
  const timeB = scanB ? new Date(scanB.timestamp).getTime() : 0;
  const isReversed = Boolean(scanA && scanB && !isSameScan && timeA > timeB);
  const isEqualTimestamp = Boolean(scanA && scanB && !isSameScan && timeA === timeB);

  const isEligibleA = scanA ? scanA.comparison_eligible !== false : true;
  const isEligibleB = scanB ? scanB.comparison_eligible !== false : true;
  const hasQualityWarnings = Boolean(scanA && scanB && (!isEligibleA || !isEligibleB));

  // Photo viewing is always allowed for distinct chronological pairs.
  // Quality warnings are shown inline beside affected photos, not as blocking gates.
  const isValidComparison = Boolean(scanA && scanB && !isSameScan && timeA < timeB);

  const getSeverityStyle = (predictedClass) => {
    switch (predictedClass) {
      case 'Mild Acne':
        return { bg: 'rgba(34, 198, 142, 0.1)', color: 'var(--color-mint-success)', border: 'rgba(34, 198, 142, 0.3)' };
      case 'Moderate Acne':
        return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Severe Acne':
      case 'Very Severe Acne':
        return { bg: 'rgba(232, 99, 74, 0.1)', color: 'var(--color-coral-accent)', border: 'rgba(232, 99, 74, 0.3)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px' }}>
            Skin Journey Progress Tracking
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-gray-600)', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
            Compare your saved skin checks over time to observe gradual changes and stay consistent with your skincare routine.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchScans}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--color-gray-300)',
              background: '#fff',
              color: 'var(--color-navy-deep)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <Link
            to="/scan"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--color-navy-deep)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(13, 27, 62, 0.15)'
            }}
          >
            <Camera size={16} />
            New Skin Check
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <RefreshCw size={28} className="spin" color="var(--color-gray-400)" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '16px 20px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Case 1: Fewer than 2 scans */}
      {!loading && !error && scans.length < 2 && (
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--color-gray-200)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(34, 198, 142, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            <Calendar size={32} color="var(--color-mint-success)" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '12px' }}>
            {scans.length === 1 ? 'One scan recorded — take your second check-in to compare' : 'Your skin journey starts with your first scan'}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--color-gray-600)', maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            {scans.length === 1
              ? 'You need at least two scans to compare your skin over time. Add your next check-in after continuing your routine to unlock side-by-side tracking!'
              : 'Upload photos, monitor changes over time, and stay consistent with your skincare routine. Add a well-lit photo today to start tracking.'}
          </p>

          {/* Show the single scan if available */}
          {scans.length === 1 && (
            <div style={{ maxWidth: '360px', margin: '0 auto 32px', textAlign: 'left', background: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: scans[0].comparison_eligible === false ? '#c2410c' : 'var(--color-mint-success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{scans[0].comparison_eligible === false ? 'Baseline Check-in (Quality Flagged)' : 'Baseline Check-in Recorded'}</span>
                {scans[0].simulated_analysis && (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                    Simulated Demo
                  </span>
                )}
              </div>
              <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', background: '#0F172A' }}>
                <AuthenticatedImage scan={scans[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>
                {getDisplayLabel(scans[0].predicted_class)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                Recorded on {formatDate(scans[0].timestamp)}
              </div>
            </div>
          )}

          <Link
            to="/scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-navy-deep)',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(13, 27, 62, 0.15)'
            }}
          >
            <Camera size={18} />
            {scans.length === 1 ? 'Take Next Skin Check' : 'Start My First Scan'}
          </Link>
        </div>
      )}

      {/* Case 2: 2 or more scans - Side-by-Side Comparison */}
      {!loading && !error && scans.length >= 2 && scanA && scanB && (
        <div>
          {/* Comparison Selector Controls */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid var(--color-gray-200)',
            padding: '20px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Baseline (Earlier):</span>
                <select
                  value={scanAId || ''}
                  onChange={(e) => setScanAId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-gray-300)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-navy-deep)',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minWidth: 0
                  }}
                >
                  {scans.map((s, idx) => {
                    const isEligible = s.comparison_eligible !== false;
                    const isSimulated = s.simulated_analysis === true;
                    return (
                      <option key={s.id} value={s.id}>
                        Scan {idx + 1} — {formatDate(s.timestamp)} ({getDisplayLabel(s.predicted_class)}){isSimulated ? ' [Simulated Demo]' : ''}{!isEligible ? ' ⚠️ (Quality Flagged)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="desktop-only-block" style={{ display: 'flex', alignItems: 'center' }}>
                <ArrowLeftRight size={18} color="var(--color-gray-400)" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Follow-up (Later):</span>
                <select
                  value={scanBId || ''}
                  onChange={(e) => setScanBId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-gray-300)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-navy-deep)',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    minWidth: 0
                  }}
                >
                  {scans.map((s, idx) => {
                    const isEligible = s.comparison_eligible !== false;
                    const isSimulated = s.simulated_analysis === true;
                    return (
                      <option key={s.id} value={s.id}>
                        Scan {idx + 1} — {formatDate(s.timestamp)} ({getDisplayLabel(s.predicted_class)}){isSimulated ? ' [Simulated Demo]' : ''}{!isEligible ? ' ⚠️ (Quality Flagged)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {isValidComparison && (
              <div style={{ fontSize: '13px', color: 'var(--color-navy-deep)', background: 'rgba(34,198,142,0.12)', border: '1px solid rgba(34,198,142,0.3)', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>
                Interval: <strong>{getDaysBetween(scanA.timestamp, scanB.timestamp)} days elapsed</strong>
              </div>
            )}
            {hasQualityWarnings && !isSameScan && !isReversed && !isEqualTimestamp && (
              <div style={{ fontSize: '13px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>
                Quality Note — See warnings below
              </div>
            )}
            {isSameScan && (
              <div style={{ fontSize: '13px', color: '#b45309', background: '#fef3c7', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>
                Selection: Same Check-in
              </div>
            )}
            {isReversed && (
              <div style={{ fontSize: '13px', color: '#b91c1c', background: '#fee2e2', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>
                Selection: Reversed Order
              </div>
            )}
            {isEqualTimestamp && (
              <div style={{ fontSize: '13px', color: '#475569', background: '#f1f5f9', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>
                Selection: Equal Timestamps
              </div>
            )}
          </div>

          {/* Compact quality warning banner (non-blocking — photos still visible below) */}
          {hasQualityWarnings && !isSameScan && !isReversed && !isEqualTimestamp && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>
                  Photo comparison available. Differences in resolution or framing may make changes harder to assess.
                </div>
                <div style={{ fontSize: '13px', color: '#A16207', lineHeight: 1.5 }}>
                  {!isEligibleA && (
                    <div style={{ marginBottom: '2px' }}>• {formatDate(scanA.timestamp)}: {scanA.quality_flags && scanA.quality_flags.length > 0 ? scanA.quality_flags.map(f => f === 'low_resolution' ? (scanA.image_dimensions ? `Image resolution ${scanA.image_dimensions.width}×${scanA.image_dimensions.height}px (below 800px application requirement, not clinically validated)` : 'Image resolution below 800px (application requirement, not clinically validated)') : f === 'partial_face' ? 'Partial face framing detected' : f.replace('_', ' ')).join(', ') : 'Quality flagged'}</div>
                  )}
                  {!isEligibleB && (
                    <div>• {formatDate(scanB.timestamp)}: {scanB.quality_flags && scanB.quality_flags.length > 0 ? scanB.quality_flags.map(f => f === 'low_resolution' ? (scanB.image_dimensions ? `Image resolution ${scanB.image_dimensions.width}×${scanB.image_dimensions.height}px (below 800px application requirement, not clinically validated)` : 'Image resolution below 800px (application requirement, not clinically validated)') : f === 'partial_face' ? 'Partial face framing detected' : f.replace('_', ' ')).join(', ') : 'Quality flagged'}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings for Invalid States */}
          {isSameScan && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '20px',
              padding: '36px 24px',
              textAlign: 'center',
              marginBottom: '36px'
            }}>
              <AlertCircle size={32} color="#D97706" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
                Two distinct check-ins required
              </h3>
              <p style={{ fontSize: '14px', color: '#B45309', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                You have selected the same check-in for both baseline and follow-up. Skin Journey requires two distinct check-ins ordered chronologically to evaluate changes over time.
              </p>
            </div>
          )}

          {isReversed && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: '20px',
              padding: '36px 24px',
              textAlign: 'center',
              marginBottom: '36px'
            }}>
              <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
                Chronological order required (Earlier → Later)
              </h3>
              <p style={{ fontSize: '14px', color: '#B91C1C', maxWidth: '560px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                The selected baseline check-in ({formatDate(scanA.timestamp)}) is later than the follow-up check-in ({formatDate(scanB.timestamp)}). Please choose an earlier scan for baseline or a later scan for follow-up.
              </p>
              <button
                onClick={() => {
                  const temp = scanAId;
                  setScanAId(scanBId);
                  setScanBId(temp);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'var(--color-navy-deep)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeftRight size={16} />
                Swap to Chronological Order
              </button>
            </div>
          )}

          {isEqualTimestamp && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '36px 24px',
              textAlign: 'center',
              marginBottom: '36px'
            }}>
              <AlertCircle size={32} color="#64748B" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px' }}>
                Identical check-in timestamps
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
                Both selected check-ins have the exact same recorded timestamp ({formatDate(scanA.timestamp)}). Please select check-ins from different recorded dates or times to measure progress.
              </p>
            </div>
          )}

          {/* Simulated Demo Record Notice */}
          {(scanA?.simulated_analysis || scanB?.simulated_analysis) && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Info size={20} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy-deep)', marginBottom: '4px' }}>
                  Simulated Demo Check-in Comparison
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  One or both selected check-ins contain simulated demo observations generated in local demo mode. Any severity differences reflect test simulations and do not represent measured clinical changes or improvement.
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Cards (visible for distinct check-ins) */}
          {!isSameScan && !isReversed && !isEqualTimestamp && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '36px'
          }}>
            {/* Earlier Scan Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid var(--color-gray-200)',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gray-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Earlier Check-in</span>
                    {scanA.simulated_analysis && (
                      <span style={{ fontSize: '10px', textTransform: 'none', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '1px 6px', borderRadius: '4px' }}>
                        Simulated Demo
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>
                    {formatDate(scanA.timestamp)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isEligibleA && (
                    <span style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      ⚠️ {scanA.quality_flags && scanA.quality_flags.length > 0 ? scanA.quality_flags.map(f => f.replace('_', ' ')).join(', ') : 'Quality flagged'}
                    </span>
                  )}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1px solid ${getSeverityStyle(scanA.predicted_class).border}`,
                    background: getSeverityStyle(scanA.predicted_class).bg,
                    color: getSeverityStyle(scanA.predicted_class).color
                  }}>
                    {getDisplayLabel(scanA.predicted_class)}
                  </div>
                </div>
              </div>

              <div style={{ height: '300px', background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
                <AuthenticatedImage
                  scan={scanA}
                  alt={`Scan on ${formatDate(scanA.timestamp)}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{scanA.simulated_analysis ? 'Recorded Observation (Simulated Demo)' : 'Recorded Observation'}</span>
                  {scanA.simulated_analysis && (
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Not clinical findings</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                  {scanA.simulated_analysis
                    ? 'Simulated educational guidance: Test observation generated in local demo mode, not derived from clinical model analysis.'
                    : (scanA.recommendation?.summary || 'Standard skin characteristics recorded for this check-in.')}
                </div>
              </div>
            </div>

            {/* Later Scan Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid var(--color-gray-200)',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mint-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Later Check-in</span>
                    {scanB.simulated_analysis && (
                      <span style={{ fontSize: '10px', textTransform: 'none', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '1px 6px', borderRadius: '4px' }}>
                        Simulated Demo
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>
                    {formatDate(scanB.timestamp)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isEligibleB && (
                    <span style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      ⚠️ {scanB.quality_flags && scanB.quality_flags.length > 0 ? scanB.quality_flags.map(f => f.replace('_', ' ')).join(', ') : 'Quality flagged'}
                    </span>
                  )}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1px solid ${getSeverityStyle(scanB.predicted_class).border}`,
                    background: getSeverityStyle(scanB.predicted_class).bg,
                    color: getSeverityStyle(scanB.predicted_class).color
                  }}>
                    {getDisplayLabel(scanB.predicted_class)}
                  </div>
                </div>
              </div>

              <div style={{ height: '300px', background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
                <AuthenticatedImage
                  scan={scanB}
                  alt={`Scan on ${formatDate(scanB.timestamp)}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy-deep)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{scanB.simulated_analysis ? 'Recorded Observation (Simulated Demo)' : 'Recorded Observation'}</span>
                  {scanB.simulated_analysis && (
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Not clinical findings</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                  {scanB.simulated_analysis
                    ? 'Simulated educational guidance: Test observation generated in local demo mode, not derived from clinical model analysis.'
                    : (scanB.recommendation?.summary || 'Standard skin characteristics recorded for this check-in.')}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Authentic Date-Based Timeline Scrubber */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid var(--color-gray-200)',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-navy-deep)' }}>
                Recorded Check-in Timeline
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
                {scans.length} total check-in{scans.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Timeline nodes labeled strictly by actual scan dates */}
            <div style={{ position: 'relative', padding: '16px 8px 8px 8px' }}>
              <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', height: '2px', background: '#E2E8F0', zIndex: 0 }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1, overflowX: 'auto', gap: '16px', paddingBottom: '8px' }}>
                {scans.map((s, idx) => {
                  const isSelectedA = s.id === scanAId;
                  const isSelectedB = s.id === scanBId;
                  const isSelected = isSelectedA || isSelectedB;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (s.id === scanAId || s.id === scanBId) return;
                        const targetTime = new Date(s.timestamp).getTime();
                        const timeBaseline = scanA ? new Date(scanA.timestamp).getTime() : 0;
                        const timeFollowup = scanB ? new Date(scanB.timestamp).getTime() : 0;
                        if (targetTime < timeFollowup) {
                          setScanAId(s.id);
                        } else if (targetTime > timeBaseline) {
                          setScanBId(s.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        minWidth: '80px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isSelected 
                          ? 'var(--color-navy-deep)' 
                          : s.comparison_eligible === false 
                            ? '#fed7aa' 
                            : '#CBD5E1',
                        border: s.comparison_eligible === false && !isSelected ? '2px solid #ea580c' : '3px solid #fff',
                        boxShadow: isSelected ? '0 0 0 2px var(--color-navy-deep)' : 'none',
                        marginBottom: '8px',
                        transition: 'all 0.2s'
                      }}></div>
                      <div style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-navy-deep)' : 'var(--color-gray-600)' }}>
                        {formatShortDate(s.timestamp)}
                      </div>
                      <div style={{ fontSize: '11px', color: s.comparison_eligible === false ? '#c2410c' : 'var(--color-gray-400)', marginTop: '2px', fontWeight: s.comparison_eligible === false ? 600 : 400 }}>
                        {s.comparison_eligible === false ? '⚠️ Flagged' : (s.simulated_analysis ? `Check-in ${idx + 1} (Simulated)` : `Check-in ${idx + 1}`)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
