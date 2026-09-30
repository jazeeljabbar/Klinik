import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `http://${window.location.hostname}:5001`
    : 'http://127.0.0.1:5001'
);
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for model inference
  headers: {
    'Accept': 'application/json',
  },
});
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export async function analyzeImage(imageFile, source = 'unknown', guestConsent = false) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('source', source);
  formData.append('client_capture_timestamp', new Date().toISOString());
  if (guestConsent) {
    formData.append('guest_consent', 'true');
  }

  try {
    const response = await api.post('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    if (data.error_type === 'low_confidence') {
      const err = new Error(data.message);
      err.errorType = 'low_confidence';
      err.confidence = data.confidence;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.errorType) {
      throw error;
    }

    if (error.response) {
      const serverData = error.response.data;
      const err = new Error(serverData.message || 'Analysis failed. Please try again.');
      err.errorType = serverData.error_type || 'server_error';
      throw err;
    } else if (error.request) {
      throw new Error('Unable to connect to the server. Please ensure the backend is running.');
    } else {
      throw new Error('An unexpected error occurred.');
    }
  }
}
export async function checkHealth() {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Backend server is not reachable.');
  }
}

export async function login(email, password) {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}

export async function signup(userData) {
  try {
    const response = await api.post('/api/auth/signup', userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Signup failed');
  }
}

export async function recordConsent(consentData) {
  try {
    const response = await api.post('/api/auth/consent', consentData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to record consent');
  }
}

export async function getCurrentUser() {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch current user');
  }
}

export async function requestOtp(email) {
  try {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to request OTP');
  }
}

export async function verifyOtp(email, otp) {
  try {
    const response = await api.post('/api/auth/verify-otp', { email, otp });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Invalid OTP');
  }
}

export async function resetPassword(email, otp, newPassword) {
  try {
    const response = await api.post('/api/auth/reset-password', { email, otp, newPassword });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to reset password');
  }
}

export async function googleLogin(token) {
  try {
    const response = await api.post('/api/auth/google', { token });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || 'Google login failed';
    const err = new Error(message);
    err.errorType = error.response?.data?.error_type;
    err.status = error.response?.status;
    throw err;
  }
}

export function logout() {
  // No-op, managed by AuthContext now
}

export async function getHistory() {
  try {
    const response = await api.get('/api/history/');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch history');
  }
}

export async function saveHistory(historyData) {
  try {
    const response = await api.post('/api/history/', historyData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to save history');
  }
}

export async function deleteHistory(historyId) {
  try {
    const response = await api.delete(`/api/history/${historyId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete history');
  }
}

export default api;
