import { motion } from 'framer-motion';
import { FiCpu, FiCamera, FiZap, FiShield, FiDatabase, FiHeart } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

const features = [
  {
    icon: <FiCamera />,
    title: 'Photo Upload',
    description: 'Upload a clear photo of your skin using your camera or photo library.',
  },
  {
    icon: <FiCpu />,
    title: 'Skin Analysis',
    description: 'Analyze visible skin characteristics and generate a detailed assessment.',
  },
  {
    icon: <FiZap />,
    title: 'Progress Tracking',
    description: 'Compare scans over time and monitor changes in your skin.',
  },
  {
    icon: <FiShield />,
    title: 'Privacy First',
    description: 'Your photos and scan history remain private and secure.',
  },
  {
    icon: <FiDatabase />,
    title: 'Scan History',
    description: 'Access previous scans and review your progress over time.',
  },
  {
    icon: <FiHeart />,
    title: 'Personalized Insights',
    description: 'Receive observations and recommendations based on your scan results.',
  },
];

export default function HowItWorks() {
  return (
    <div style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
              How It Works
            </div>
          </div>
          
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            textAlign: 'center',
            marginBottom: '36px',
          }}>
            Simple, Private, and Accurate
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            marginBottom: '60px',
          }}>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="glass-strong"
                style={{
                  borderRadius: '16px',
                  padding: '28px',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  fontSize: '1.3rem',
                  marginBottom: '16px',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)',
                  marginBottom: '8px',
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.88rem',
                  color: '#64748b',
                  lineHeight: 1.6,
                }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
