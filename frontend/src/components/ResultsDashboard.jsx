import { motion } from 'framer-motion';
import { ScanLine, Info, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import { getDisplayLabel } from '../utils/labels';

const DEFAULT_GUIDANCE = {
  'Clear Skin': {
    summary: 'Your skin appears clear with minimal visible blemishes detected.',
    tips: [
      'Maintain your current routine with a gentle cleanser twice daily.',
      'Apply a broad-spectrum SPF 30+ sunscreen every morning.',
      'Keep skin hydrated with a lightweight non-comedogenic moisturizer.'
    ],
    products: 'Gentle cleanser, lightweight moisturizer, broad-spectrum SPF 30+'
  },
  'Mild Acne': {
    summary: 'Minor blemishes detected that can typically be managed with consistent, gentle over-the-counter skincare routines.',
    tips: [
      'Use a mild, non-irritating cleanser twice daily.',
      'Follow cleansing with a non-comedogenic, oil-free moisturizer.',
      'Avoid picking or scrubbing affected areas to prevent irritation and barrier damage.',
      'Consult a board-certified dermatologist for personalized advice.'
    ],
    products: 'Gentle daily cleanser, oil-free moisturizer, broad-spectrum sunscreen'
  },
  'Moderate Acne': {
    summary: 'Moderate visible blemishes detected across target areas.',
    tips: [
      'Maintain a consistent morning and evening cleansing and moisturizing routine.',
      'Avoid harsh scrubs or aggressive exfoliation that can aggravate inflammation.',
      'Keep pillowcases fresh and avoid frequent face touching.',
      'Consult a board-certified dermatologist if blemishes persist or cause discomfort.'
    ],
    products: 'Gentle non-foaming cleanser, oil-free moisturizer, broad-spectrum SPF'
  },
  'Severe Acne': {
    summary: 'Significant visible blemishes detected across evaluated areas.',
    tips: [
      'Schedule a consultation with a board-certified dermatologist for personalized treatment.',
      'Use an ultra-gentle, fragrance-free cleanser and avoid abrasive scrubs.',
      'Do not squeeze or extract blemishes to help prevent scarring.'
    ],
    products: 'Ultra-gentle cleanser, fragrance-free moisturizer'
  },
  'Very Severe Acne': {
    summary: 'Extensive visible blemishes detected. Professional dermatological evaluation is advised.',
    tips: [
      'Consult a board-certified dermatologist for formal clinical assessment and personalized care.',
      'Rely on ultra-mild, non-irritating cleansers without abrasive exfoliants.',
      'Avoid picking, manipulating, or scrubbing affected areas.'
    ],
    products: 'Ultra-mild, physician-guided skincare products'
  }
};

export default function ResultsDashboard({ results }) {
  if (!results) return null;

  const { predicted_class, timestamp, source, comparison_eligible, quality_flags, recommendation } = results;
  const displayLabel = getDisplayLabel(predicted_class);

  const fallback = DEFAULT_GUIDANCE[predicted_class] || {
    summary: 'Standard skin characteristics observed for this scan.',
    tips: ['Maintain a gentle cleansing routine twice daily and apply SPF sunscreen.'],
    products: 'Gentle cleanser, oil-free moisturizer'
  };

  const isSimulated = results.simulated_analysis === true;
  const isScanDerived = !isSimulated && Boolean(recommendation && (recommendation.summary || (recommendation.tips && recommendation.tips.length > 0)));

  const activeRecommendation = {
    summary: isSimulated
      ? (results.model_notice || 'Simulated educational guidance: Test observation generated in local demo mode, not derived from clinical model analysis.')
      : (recommendation?.summary || fallback.summary),
    tips: (recommendation?.tips && recommendation.tips.length > 0) ? recommendation.tips : fallback.tips,
    products: recommendation?.products || fallback.products,
    urgency: isSimulated ? null : (recommendation?.urgency || null)
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getSourceLabel = (src) => {
    if (src === 'camera') return "Captured with camera";
    if (src === 'gallery') return "Uploaded from device";
    return null;
  };

  const mapQualityFlag = (flag) => {
    switch (flag) {
      case 'blur': return "Photo may be unclear";
      case 'low_light': return "Photo may be too dark";
      case 'overexposed': return "Photo may be too bright";
      case 'no_face': return "Face was not clearly detected";
      case 'partial_face': return "Partial face framing detected (close-up or profile crop)";
      case 'low_resolution':
        return results.image_dimensions
          ? `Image resolution ${results.image_dimensions.width}×${results.image_dimensions.height}px (below 800px application requirement, not clinically validated)`
          : "Image below 800px (application requirement, not clinically validated)";
      default: return flag;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ paddingBottom: '10px' }}
    >
      <div className="container" style={{ maxWidth: '800px', padding: '0' }}>
        
        {results.simulated_analysis && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <Info size={20} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy-deep)', marginBottom: '4px' }}>
                Local demo — simulated analysis
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                {results.model_notice || "The neural network model weights are not loaded locally; this assessment is simulated for workflow preview and should not be used as clinical findings."}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '8px' }}>Your Skin Check</h2>
          {timestamp && (
            <p style={{ color: 'var(--color-gray-600)', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
              {formatDate(timestamp)}
            </p>
          )}
          {source && getSourceLabel(source) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
              <Camera size={14} />
              {getSourceLabel(source)}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Result Card: Display Label */}
          <div className="subtle-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-navy-deep)' }}>
              <ScanLine size={20} />
              <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI skin analysis estimate</div>
            </div>
            
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-navy-deep)', margin: '8px 0' }}>
              {displayLabel}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(13, 27, 62, 0.04)', padding: '16px', borderRadius: '12px', marginTop: '16px', width: '100%' }}>
              <Info size={20} color="var(--color-gray-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: 'var(--color-gray-600)', margin: 0, lineHeight: 1.5, textAlign: 'left' }}>
                This is an image-based estimate to help you observe changes over time. It is not a medical diagnosis.
              </p>
            </div>
          </div>
          
          {/* Quality Panel */}
          {comparison_eligible !== undefined && (
            <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--color-gray-200)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              {comparison_eligible ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={24} color="var(--color-mint-success)" style={{ flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 4px 0' }}>Ready for future comparison</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', margin: 0 }}>This image meets the clarity and lighting guidelines for tracking progress.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertCircle size={24} color="#92400e" style={{ flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: '0 0 4px 0' }}>Quality note</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                      Photo comparison available. Differences in resolution or framing may make changes harder to assess.
                    </p>
                    {quality_flags && quality_flags.length > 0 && (
                      <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#475569', fontSize: '0.85rem' }}>
                        {quality_flags.map((flag, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{mapQualityFlag(flag)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observations & Skincare Guidance Card */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            border: isScanDerived ? '1px solid rgba(34, 198, 142, 0.4)' : '1px solid var(--color-gray-200)',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color={isSimulated ? '#64748b' : (isScanDerived ? 'var(--color-mint-success)' : 'var(--color-gray-500)')} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-navy-deep)', margin: 0 }}>
                  {isSimulated ? 'Simulated Guidance (Demo Mode)' : (isScanDerived ? 'Scan-Derived Observations & Guidance' : 'General Skincare Guidelines (Preset Guidance)')}
                </h3>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '3px 8px',
                borderRadius: '6px',
                background: isSimulated ? '#f1f5f9' : (isScanDerived ? 'rgba(34, 198, 142, 0.12)' : 'rgba(100, 116, 139, 0.1)'),
                color: isSimulated ? '#475569' : (isScanDerived ? 'var(--color-mint-success)' : '#475569'),
                border: isSimulated ? '1px solid #cbd5e1' : 'none'
              }}>
                {isSimulated ? 'Simulated Demo' : (isScanDerived ? (activeRecommendation.urgency ? `Urgency: ${activeRecommendation.urgency}` : 'Scan-Derived') : 'Preset Educational Guidance')}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: isScanDerived ? 'var(--color-gray-500)' : '#64748b', margin: '0 0 14px 0', fontStyle: 'italic' }}>
              {isScanDerived
                ? 'Observations and suggested routine care tailored to the visual characteristics identified in this scan.'
                : 'General educational care practices based on standard skincare hygiene. No custom scan observations were returned for this check-in.'}
            </p>
            
            <p style={{ fontSize: '0.95rem', color: 'var(--color-gray-700)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              {activeRecommendation.summary}
            </p>

            {activeRecommendation.tips && activeRecommendation.tips.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy-deep)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  {isScanDerived ? 'Targeted Skincare Considerations' : 'General Care Suggestions'}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeRecommendation.tips.map((tip, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                      <span style={{ color: isScanDerived ? 'var(--color-mint-success)' : 'var(--color-gray-400)', fontWeight: 700, flexShrink: 0 }}>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeRecommendation.products && (
              <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isScanDerived ? 'Ingredient & Routine Considerations:' : 'General Routine Considerations:'}
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                  {activeRecommendation.products}
                </p>
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', borderTop: '1px solid var(--color-gray-200)', paddingTop: '12px', lineHeight: 1.4 }}>
              <strong>Notice:</strong> Suggestions are general cosmetic skincare guidelines and do not constitute medical diagnosis, prescription advice, or specialized clinical treatment.
            </div>
          </div>

          {/* Helpful Next Step */}
          <div style={{ padding: '24px', background: 'var(--color-navy-deep)', color: '#fff', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Helpful next step
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, color: '#e2e8f0' }}>
              Try to take your next skin check in similar lighting and from a similar distance. Consistent photos can make future comparisons more useful.
            </p>
          </div>

        </div>
      </div>
    </motion.section>
  );
}
