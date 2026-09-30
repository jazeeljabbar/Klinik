import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { recordConsent } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ConsentModal({ isOpen }) {
  const { updateUser, logout } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [medicalAcknowledged, setMedicalAcknowledged] = useState(false);
  const [imageAuthorized, setImageAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted || !medicalAcknowledged || !imageAuthorized) {
      setError('Please review and agree to all required disclosures to proceed.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await recordConsent({
        terms_accepted: termsAccepted,
        medical_disclaimer_acknowledged: medicalAcknowledged,
        image_processing_authorized: imageAuthorized,
      });

      if (res?.user) {
        updateUser(res.user);
      } else {
        updateUser({
          consent_required: false,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to record consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 27, 62, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '540px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          width: '100%',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(13, 27, 62, 0.25)',
          border: '1px solid rgba(13, 27, 62, 0.08)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(34, 198, 142, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-mint-success)',
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-navy-deep)',
              margin: 0,
            }}>
              Required Consent & Disclosures
            </h2>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-gray-600)',
              margin: '2px 0 0 0',
            }}>
              Please review and confirm your preferences to use Klinik
            </p>
          </div>
        </div>

        <p style={{
          fontSize: '14px',
          color: 'var(--color-gray-600)',
          lineHeight: 1.5,
          marginBottom: '20px',
        }}>
          To provide personalized skin assessments, save your progress over time, and protect your privacy, we require your explicit agreement before scanning or saving records.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Checkbox 1: Terms */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--color-slate-50)',
            border: '1px solid #E2E8F0',
          }}>
            <input
              type="checkbox"
              id="modal-terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-navy-deep)' }}
            />
            <label htmlFor="modal-terms" style={{ fontSize: '13px', color: 'var(--color-navy-deep)', lineHeight: 1.45, cursor: 'pointer' }}>
              I agree to the <Link to="/terms" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Terms of Service</Link> and <Link to="/privacy" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Privacy Policy</Link>.
            </label>
          </div>

          {/* Checkbox 2: Medical Disclaimer */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--color-slate-50)',
            border: '1px solid #E2E8F0',
          }}>
            <input
              type="checkbox"
              id="modal-medical"
              checked={medicalAcknowledged}
              onChange={(e) => setMedicalAcknowledged(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-navy-deep)' }}
            />
            <label htmlFor="modal-medical" style={{ fontSize: '13px', color: 'var(--color-navy-deep)', lineHeight: 1.45, cursor: 'pointer' }}>
              I acknowledge that Klinik provides non-diagnostic educational assessments and does not offer professional healthcare, diagnosis, or prescription treatment.
            </label>
          </div>

          {/* Checkbox 3: Image Processing */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--color-slate-50)',
            border: '1px solid #E2E8F0',
          }}>
            <input
              type="checkbox"
              id="modal-image"
              checked={imageAuthorized}
              onChange={(e) => setImageAuthorized(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-navy-deep)' }}
            />
            <label htmlFor="modal-image" style={{ fontSize: '13px', color: 'var(--color-navy-deep)', lineHeight: 1.45, cursor: 'pointer' }}>
              I authorize Klinik to upload and store my skin scan photos on secure cloud infrastructure to perform automated assessments and maintain my private check-in records.
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-gray-500)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Log Out Instead
            </button>

            <button
              type="submit"
              disabled={!termsAccepted || !medicalAcknowledged || !imageAuthorized || isSubmitting}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                opacity: (!termsAccepted || !medicalAcknowledged || !imageAuthorized || isSubmitting) ? 0.5 : 1,
                cursor: (!termsAccepted || !medicalAcknowledged || !imageAuthorized || isSubmitting) ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Accept & Continue'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
