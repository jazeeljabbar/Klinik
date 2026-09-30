import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import ImagePreview from '../components/ImagePreview';
import LoadingScreen from '../components/LoadingScreen';
import ResultsDashboard from '../components/ResultsDashboard';
import GuestScanDisclosureModal from '../components/GuestScanDisclosureModal';
import { analyzeImage, saveHistory as saveBackendHistory } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Scan() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [selectedFile, setSelectedFile] = useState(() => location.state?.initialFile || null);
  const [source, setSource] = useState(() => location.state?.initialSource || null); // 'camera' or 'gallery'
  const [previewUrl, setPreviewUrl] = useState(() => location.state?.initialFile ? URL.createObjectURL(location.state.initialFile) : null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showGuestDisclosure, setShowGuestDisclosure] = useState(false);
  const [guestConsentAcknowledged, setGuestConsentAcknowledged] = useState(false);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCameraTracks();
  }, [stopCameraTracks]);

  const handleStartCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    setCapturedBlob(null);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access is unavailable. You can still upload a photo from your device.");
      stopCameraTracks();
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      // Mirror the context if using front-facing camera (optional, but standard UX)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        setCapturedBlob(blob);
        setCapturedPreview(URL.createObjectURL(blob));
        videoRef.current.pause();
      }, 'image/jpeg');
    }
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play();
    }
  };

  const handleUsePhoto = () => {
    const file = new File([capturedBlob], "camera_capture.jpg", { type: "image/jpeg" });
    setSelectedFile(file);
    setPreviewUrl(capturedPreview);
    setSource('camera');
    stopCameraTracks();
    setShowCamera(false);
    setResults(null);
    setError(null);
  };

  const handleCancelCamera = () => {
    stopCameraTracks();
    setShowCamera(false);
    setCapturedBlob(null);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
  };

  const handleImageSelect = useCallback((file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSource('gallery');
    setResults(null);
    setError(null);
  }, []);

  const handleRemove = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setSource(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  }, [previewUrl]);

  const executeAnalysis = useCallback(async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const isGuest = !isAuthenticated;
      const data = await analyzeImage(selectedFile, source, isGuest);
      // source is known only to the frontend
      data.source = source;
      setResults(data);
      const token = localStorage.getItem('token');
      // Save history using only the server-issued scan_id for logged-in users
      if (token && isAuthenticated && data.scan_id) {
        try {
          await saveBackendHistory({
            scan_id: data.scan_id,
            source: source,
            client_capture_timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error("Failed to save scan to database:", e);
        }
      }
    } catch (err) {
      setError({
        message: err.message || 'Analysis failed. Please try again.',
        type: err.errorType || 'generic',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, source, isAuthenticated]);

  const handleAnalyze = useCallback(() => {
    if (!selectedFile) return;
    if (!isAuthenticated && !guestConsentAcknowledged) {
      setShowGuestDisclosure(true);
      return;
    }
    executeAnalysis();
  }, [selectedFile, isAuthenticated, guestConsentAcknowledged, executeAnalysis]);

  const handleConfirmGuestDisclosure = useCallback(() => {
    setGuestConsentAcknowledged(true);
    setShowGuestDisclosure(false);
    executeAnalysis();
  }, [executeAnalysis]);

  if (showCamera) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleCancelCamera} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {cameraError ? (
            <div style={{ color: '#fff', textAlign: 'center', padding: '24px' }}>
              <Camera size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <p>{cameraError}</p>
              <button onClick={handleCancelCamera} style={{ marginTop: '16px', padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600 }}>
                Go Back
              </button>
            </div>
          ) : (
            <>
              {!capturedBlob && (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
              )}
              {capturedPreview && (
                <img 
                  src={capturedPreview} 
                  alt="Captured preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              )}
            </>
          )}
        </div>

        {!cameraError && (
          <div style={{ padding: '32px 24px', paddingBottom: '48px', display: 'flex', justifyContent: 'center', gap: '24px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            {!capturedBlob ? (
              <button 
                onClick={handleCapture} 
                style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer', backgroundClip: 'padding-box' }}
                aria-label="Capture photo"
              />
            ) : (
              <>
                <button onClick={handleRetake} style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                  Retake
                </button>
                <button onClick={handleUsePhoto} style={{ padding: '14px 32px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                  Use This Photo
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Initial Uploader State
  if (!selectedFile) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-navy-deep)', marginBottom: '16px' }}>Take or upload a photo</h2>
        <p style={{ fontSize: '15px', color: 'var(--color-gray-600)', marginBottom: '32px' }}>
          For best results, use good lighting and ensure your face is clearly visible.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px'
        }}>
          {/* Camera Button */}
          <div 
            onClick={handleStartCamera}
            style={{
              border: '2px solid var(--color-slate-200)',
              borderRadius: '24px',
              padding: '48px 24px',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-slate-200)'}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <Camera size={32} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Take Photo</div>
            <div style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>Use your device camera</div>
          </div>

          {/* Upload Button */}
          <div style={{
            border: '2px dashed var(--color-slate-300)',
            borderRadius: '24px',
            padding: '48px 24px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy-deep)' }}>
              <ImageIcon size={32} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-navy-deep)' }}>Upload Photo</div>
            
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageSelect(e.target.files[0]);
              }}
              id="scan-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="scan-upload" style={{
              background: 'var(--color-navy-deep)',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-block',
              fontSize: '0.95rem'
            }}>
              Choose File
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <AnimatePresence>
        {isAnalyzing && <LoadingScreen />}
      </AnimatePresence>

      {!results && (
        <ImagePreview
          file={selectedFile}
          previewUrl={previewUrl}
          onAnalyze={handleAnalyze}
          onRemove={handleRemove}
          isAnalyzing={isAnalyzing}
        />
      )}

      {error && (
        <div className="container" style={{ maxWidth: '700px', marginBottom: '20px', marginTop: '20px' }}>
          <div style={{ padding: '28px 24px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', color: '#dc2626', marginBottom: '8px' }}>
              Analysis Error
            </p>
            <p style={{ color: '#64748b', fontSize: '0.92rem' }}>{error.message}</p>
            <button onClick={handleRemove} style={{ marginTop: '16px', padding: '10px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {results && (
        <div style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto' }}>
          <ResultsDashboard results={results} />
          
          {/* Post-scan Actions */}
          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <div style={{
                background: 'rgba(34, 198, 142, 0.08)',
                border: '1px solid rgba(34, 198, 142, 0.25)',
                borderRadius: '16px',
                padding: '24px 20px',
                maxWidth: '560px',
                margin: '0 auto 24px auto',
              }}>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-navy-deep)', fontSize: '16px', fontWeight: 600 }}>
                  Save your scan & track progress over time
                </h4>
                <p style={{ margin: '0 0 16px 0', color: 'var(--color-gray-600)', fontSize: '13px', lineHeight: 1.5 }}>
                  Create a free Klinik account to securely save your skin assessments, compare changes, and follow your Skin Journey.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/signup" style={{ padding: '10px 20px', background: 'var(--color-navy-deep)', color: '#fff', borderRadius: '10px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                    Create Free Account
                  </Link>
                  <Link to="/login" style={{ padding: '10px 20px', background: '#fff', color: 'var(--color-navy-deep)', border: '1px solid var(--color-gray-300)', borderRadius: '10px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
                    Sign In
                  </Link>
                </div>
              </div>
              <button onClick={handleRemove} style={{ padding: '12px 24px', background: 'transparent', color: 'var(--color-navy-deep)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Analyze Another Photo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
              <Link to="/skin-check-ins" style={{ padding: '14px 24px', background: 'var(--color-navy-deep)', color: '#fff', borderRadius: '12px', fontWeight: 600, textDecoration: 'none' }}>
                View Check-ins
              </Link>
              <Link to="/dashboard" style={{ padding: '14px 24px', background: '#fff', color: 'var(--color-navy-deep)', border: '1px solid var(--color-slate-200)', borderRadius: '12px', fontWeight: 600, textDecoration: 'none' }}>
                Back to My Skin
              </Link>
              <button onClick={handleRemove} style={{ padding: '14px 24px', background: 'transparent', color: 'var(--color-navy-deep)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Add another check-in
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guest Pre-Upload Disclosure Modal */}
      <GuestScanDisclosureModal
        isOpen={showGuestDisclosure}
        onConfirm={handleConfirmGuestDisclosure}
        onCancel={() => setShowGuestDisclosure(false)}
      />
    </div>
  );
}
