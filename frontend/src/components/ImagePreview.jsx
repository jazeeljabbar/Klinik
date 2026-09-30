import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Zap, Info, Image as ImageIcon } from 'lucide-react';

export default function ImagePreview({ file, previewUrl, onAnalyze, onRemove, isAnalyzing }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (previewUrl) {
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewUrl;
    }
  }, [previewUrl]);
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (!file || !previewUrl) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{ paddingBottom: '20px' }}
    >
      <div className="container" style={{ maxWidth: '700px' }}>
        <div className="glass-strong" style={{
          overflow: 'hidden',
        }}>
          {/* Image Display */}
          <div style={{
            position: 'relative',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxHeight: '400px',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(13,27,62,0.05)'
          }}>
            <img
              src={previewUrl}
              alt="Uploaded preview"
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            {/* Remove Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRemove}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                color: 'var(--color-navy-deep)',
                border: '1px solid var(--color-gray-200)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 8px rgba(13, 27, 62, 0.1)',
              }}
              aria-label="Remove image"
            >
              <Trash2 size={16} />
            </motion.button>
          </div>

          {/* Image Metadata */}
          <div style={{ padding: '20px 24px' }}>
            {/* File info row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              color: 'var(--color-gray-600)',
              fontSize: '14px',
            }}>
              <ImageIcon size={18} color="var(--color-navy-deep)" />
              <span style={{ fontWeight: 600, color: 'var(--color-navy-deep)', marginRight: '4px' }}>
                {file.name}
              </span>
            </div>

            {/* Metadata chips */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '20px',
            }}>
              <MetadataChip
                icon={<Info size={14} />}
                label="Dimensions"
                value={`${dimensions.width} × ${dimensions.height} px`}
              />
              <MetadataChip
                icon={<Info size={14} />}
                label="Size"
                value={formatFileSize(file.size)}
              />
              <MetadataChip
                icon={<Info size={14} />}
                label="Type"
                value={file.type.split('/')[1]?.toUpperCase() || 'IMAGE'}
              />
            </div>

            {/* Analyze Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAnalyze}
              disabled={isAnalyzing}
              style={{
                width: '100%',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: 600,
                padding: '16px',
                borderRadius: '12px',
                color: '#fff',
                background: isAnalyzing ? 'var(--color-gray-400)' : 'var(--color-navy-deep)',
                border: 'none',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(13, 27, 62, 0.15)',
              }}
              id="analyze-button"
            >
              <Zap size={18} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function MetadataChip({ icon, label, value }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '9999px',
      background: 'rgba(13,27,62,0.04)',
      fontSize: '13px',
      color: 'var(--color-gray-600)',
    }}>
      <span style={{ color: 'var(--color-navy-deep)', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}:</span>
      <span style={{ fontWeight: 600, color: 'var(--color-navy-deep)' }}>{value}</span>
    </div>
  );
}
