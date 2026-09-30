import { motion } from 'framer-motion';
import { HiOutlineShieldCheck } from 'react-icons/hi2';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Data Collection",
      content: "We collect information you provide directly to us, such as when you register or modify your account details (name, email address, phone number, gender, and age)."
    },
    {
      title: "2. Image Data and Cloud Processing",
      content: "When you upload or capture a facial photograph for analysis, the image is transmitted to and stored on cloud storage infrastructure (Google Cloud Storage) and logged in our database as a pending scan record to execute automated quality verification (such as blur and lighting checks) and machine learning inference. Guest scans require pre-upload disclosure acknowledgement. For signed-in users, completed scans are automatically saved to their account history upon successful analysis. For guest scans and unpromoted pending records, uploaded images currently remain stored on cloud infrastructure. No automated bucket lifecycle rule, database TTL, recurring cloud job, or scheduled deletion routine is currently active in live production. Uploaded images remain stored until an account deletion request is processed or an automated deletion lifecycle is formally deployed. Uploaded photos are processed strictly to generate your educational skin assessments and are never used to train, retrain, or fine-tune machine learning models. Your photos are not made public and are not sold or transferred to third parties or advertisers."
    },
    {
      title: "3. Account Creation and Consent Choices",
      content: "When registering an account with email and password, verified consent choices for our Terms of Service, Medical Disclaimer, and cloud image processing are recorded and securely persisted with authoritative server UTC timestamps and active policy versions in the backend user record. Users signing in via Google and existing accounts without stored consent are presented with a one-time consent confirmation before uploading scans or saving check-in history. Inquiries regarding data retention or account deletion may be directed to the application operator once official contact channels are established."
    },
    {
      title: "4. Information Sharing",
      content: "We do not sell, rent, or trade your personal information or photographs to third parties. Information is processed through secure cloud infrastructure providers (such as Google Cloud Platform) solely to deliver core application functionality, comply with applicable legal obligations, or protect user safety."
    },
    {
      title: "5. Data Security",
      content: "We implement industry-standard security safeguards to protect stored data, including secure HTTPS transport, token-based API authentication, and short-lived signed URLs for authenticated image access."
    }
  ];

  return (
    <div style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        top: '0',
        left: '0',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        bottom: '0',
        right: '0',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ maxWidth: '800px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '50px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '9999px',
            background: 'rgba(59, 130, 246, 0.08)',
            color: 'var(--color-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            <HiOutlineShieldCheck style={{ fontSize: '1rem' }} />
            Privacy & Security
          </div>

          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(2.2rem, 5vw, 3rem)',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            lineHeight: 1.2,
            marginBottom: '16px',
          }}>
            Privacy <span className="text-gradient">Policy</span>
          </h1>

          <p style={{
            fontSize: '0.95rem',
            color: '#64748b',
          }}>
            Effective date: September 23, 2026
          </p>
        </motion.div>

        {/* Legal Sections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-strong"
          style={{
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px'
          }}
        >
          <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.7', margin: 0 }}>
            At Klinik, we take your privacy seriously. Please review our Privacy Policy to understand how we collect, use, and safeguard your information.
          </p>

          <hr style={{ border: 0, borderTop: '1px solid rgba(226, 232, 240, 0.8)', margin: 0 }} />

          {sections.map((section, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--color-primary-dark)',
                margin: 0
              }}>
                {section.title}
              </h2>
              <p style={{
                fontSize: '0.92rem',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0,
                textAlign: 'justify'
              }}>
                {section.content}
              </p>
            </div>
          ))}

          <hr style={{ border: 0, borderTop: '1px solid rgba(226, 232, 240, 0.8)', margin: 0 }} />

          <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>
            If you have questions or concerns regarding our Privacy Policy, inquiries may be directed to the application operator.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
