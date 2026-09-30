import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * Renders an image using either a pre-signed URL or by securely fetching
 * a blob via an authenticated proxy endpoint.
 */
export default function AuthenticatedImage({
  scan,
  alt = "Skin check-in",
  style = {},
  className = ""
}) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { logout } = useAuth();
  
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Reset state on scan change
    setObjectUrl(null);
    setLoading(true);
    setError(false);
    
    let isMounted = true;
    
    // Clean up any existing object URL before fetching a new one
    const cleanupObjectURL = () => {
      setObjectUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return null;
      });
    };

    // If there's an active fetch, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (!scan || (!scan.image_url && scan.image_delivery_mode !== 'authenticated_proxy')) {
      setLoading(false);
      setError(true);
      return cleanupObjectURL;
    }

    if (scan.image_delivery_mode === 'signed_url' && scan.image_url) {
      // Just use the signed URL directly
      setObjectUrl(scan.image_url);
      setLoading(false);
      return cleanupObjectURL;
    }

    if (scan.image_delivery_mode === 'authenticated_proxy') {
      const fetchImage = async () => {
        abortControllerRef.current = new AbortController();
        try {
          // Use the standard configured API client which automatically attaches the token
          const response = await api.get(`/api/history/${scan.history_id}/image`, {
            responseType: 'blob',
            signal: abortControllerRef.current.signal,
          });

          const blob = response.data;
          if (isMounted) {
            cleanupObjectURL();
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            setLoading(false);
          }
        } catch (err) {
          if (err.response && err.response.status === 401) {
            logout();
          }
          if (err.name !== 'AbortError' && err.name !== 'CanceledError' && isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      };

      fetchImage();
    } else {
      // Fallback if delivery mode is missing but image_url somehow exists (e.g., very old scans)
      if (scan.image_url) {
        setObjectUrl(scan.image_url);
        setLoading(false);
      } else {
        setError(true);
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cleanupObjectURL();
    };
  }, [scan, logout]);

  if (loading) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#cbd5e1' }} className={className}>
        <RefreshCw size={24} className="spin" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#cbd5e1' }} className={className}>
        <Camera size={32} style={{ marginBottom: '8px' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img 
      src={objectUrl} 
      alt={alt} 
      style={style} 
      className={className}
      onError={() => {
        setError(true);
      }}
    />
  );
}
