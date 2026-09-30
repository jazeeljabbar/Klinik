import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';

export default function GuestScanDisclosureModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 27, 62, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '500px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          width: '100%',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(13, 27, 62, 0.25)',
          border: '1px solid rgba(13, 27, 62, 0.08)',
          position: 'relative',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-gray-400)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(232, 99, 74, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-coral-accent)',
          }}>
            <Info size={24} />
          </div>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-navy-deep)',
              margin: 0,
            }}>
              Guest Scan Disclosure
            </h3>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-gray-600)',
              margin: '2px 0 0 0',
            }}>
              Please read before uploading your photo
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--color-slate-50)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '13px',
          color: 'var(--color-navy-deep)',
          lineHeight: 1.55,
          marginBottom: '20px',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>• Non-Diagnostic Assessment:</strong> Klinik is an educational tool and does not provide medical diagnosis, clinical advice, or treatment prescriptions. Always consult a qualified dermatologist for skin concerns.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>• Cloud Image Upload:</strong> Your photo is uploaded to secure cloud storage to run our automated acne analysis model. Your image is never used to train public AI models and is never published.
          </p>
          <p style={{ margin: 0 }}>
            <strong>• Guest Storage:</strong> Guest scans create temporary pending records. To save scans to a personal Skin Journey timeline, you will need to sign up or log in.
          </p>
        </div>

        <p style={{
          fontSize: '12px',
          color: 'var(--color-gray-500)',
          lineHeight: 1.4,
          marginBottom: '20px',
        }}>
          By clicking <strong>Agree & Proceed</strong>, you confirm your acknowledgement of these notices and our <Link to="/terms" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Terms</Link> and <Link to="/privacy" target="_blank" style={{ color: 'var(--color-navy-deep)', fontWeight: 600 }}>Privacy Policy</Link>.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid var(--color-gray-300)',
              color: 'var(--color-gray-600)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Agree & Proceed
          </button>
        </div>
      </motion.div>
    </div>
  );
}
