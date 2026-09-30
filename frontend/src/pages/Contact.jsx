import { motion } from 'framer-motion';
import { FiMail } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

export default function Contact() {
  return (
    <div style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '9999px',
            background: 'rgba(37, 99, 235, 0.08)',
            color: '#2563eb',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            <HiSparkles />
            Get in Touch
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '16px',
          }}>
            Contact <span className="text-gradient">Us</span>
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: '#64748b',
            maxWidth: '500px',
            margin: '0 auto',
          }}>
            Have questions or feedback? We'd love to hear from you.
          </p>
        </motion.div>

        {/* Contact Status Notice */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glass-strong"
          style={{
            borderRadius: '20px',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(6, 182, 212, 0.1))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            fontSize: '1.4rem',
            marginBottom: '16px',
          }}>
            <FiMail />
          </div>
          <h2 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '8px',
          }}>
            Contact Channels Pending Release
          </h2>
          <p style={{
            fontSize: '0.92rem',
            color: '#64748b',
            lineHeight: 1.6,
            maxWidth: '440px',
            margin: '0 auto',
          }}>
            Official contact email, user support channels, and publisher details will be published here upon live commercial release.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
