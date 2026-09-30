import { motion } from 'framer-motion';
import { HiOutlineDocumentText } from 'react-icons/hi2';

export default function Terms() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using the Klinik application—whether through guest scanning or registered accounts—you agree to be bound by these Terms and Conditions. Registered accounts require verified acknowledgement of our Terms, Medical Disclaimer, and Cloud Image Processing authorization. Google Sign-In and existing accounts must confirm required consent before uploading scans or saving check-in history. If you do not agree to these terms, you must not access or use the application."
    },
    {
      title: "2. Image Upload, Storage, and Processing Policy",
      content: "When you submit a facial image for analysis (via camera capture or photo upload), the image is transmitted to cloud storage (Google Cloud Storage) and recorded in our database as a pending scan to perform quality validation and automated machine learning assessment. Guest scans require pre-upload disclosure acknowledgement. For registered users, completed scans are automatically saved to their private account history in Google Cloud Storage and Firestore upon successful analysis. For guest scans and unpromoted pending records, uploaded images currently remain stored on cloud infrastructure. No automated bucket lifecycle rule, database TTL, recurring cloud job, or scheduled deletion routine is currently active in live production. Uploaded images remain in cloud storage until an account deletion request is processed or an automated deletion lifecycle is formally deployed. Klinik processes scans using frozen, pre-trained algorithmic models and does not use your photos to train, retrain, or improve machine learning models. Your photos are never distributed publicly and are never sold or transferred to third-party advertisers."
    },
    {
      title: "3. No Medical Advice Disclaimer",
      content: "The content and analysis provided by Klinik are for informational and educational purposes only. It is not, and is not intended to be, a substitute for professional healthcare, skin analysis, or treatment. Always seek the advice of a qualified dermatologist or other healthcare providers with any questions regarding a skin condition. Never disregard professional guidance or delay in seeking it because of something you have read on this application."
    },
    {
      title: "4. User Accounts and Security",
      content: "To access certain features of the service, you must create a registered account. You are solely responsible for maintaining the confidentiality of your account credentials (username, password, phone number) and for all activities that occur under your account. You must notify us immediately of any unauthorized use or security breach."
    },
    {
      title: "5. Intellectual Property",
      content: "All content, features, logos, graphics, user interface designs, and backend algorithms used in the Klinik application are the exclusive property of the application operator and are protected by copyright, trademark, and other applicable intellectual property laws."
    },
    {
      title: "6. Limitation of Liability",
      content: "To the maximum extent permitted by law, Klinik and its operators, contributors, or agents shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use of, or inability to use, this application or the analysis results provided."
    },
    {
      title: "7. Modifications to Terms",
      content: "We reserve the right to revise these Terms and Conditions at any time without prior notice. By continuing to use the service after amendments are published, you agree to accept and abide by the updated terms."
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
            <HiOutlineDocumentText style={{ fontSize: '1rem' }} />
            Legal Agreement
          </div>

          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(2.2rem, 5vw, 3rem)',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            lineHeight: 1.2,
            marginBottom: '16px',
          }}>
            Terms and <span className="text-gradient">Conditions</span>
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
            Welcome to Klinik. Please review the following Terms and Conditions carefully. These terms govern your use of our website, application, services, and technologies.
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
            If you have questions or concerns regarding these Terms and Conditions, inquiries may be directed to the application operator.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
