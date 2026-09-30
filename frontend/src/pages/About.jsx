import { motion } from 'framer-motion';
import { HiSparkles } from 'react-icons/hi2';

export default function About() {
  return (
    <div style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '9999px',
            background: 'rgba(27, 37, 89, 0.08)',
            color: 'var(--color-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            <HiSparkles />
            About Klinik
          </div>

          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            lineHeight: 1.2,
            marginBottom: '20px',
          }}>
            Transforming Dermatology with{' '}
            <span className="text-gradient">Artificial Intelligence</span>
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: '#64748b',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Klinik leverages state-of-the-art deep learning technology to provide
            instant, non-invasive skin analysis from a simple photograph. Our mission is to make skin tracking simple, private, and insightful.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
