import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';

import PublicHome from './pages/PublicHome';
import AuthHome from './pages/AuthHome';
import Scan from './pages/Scan';
import SkinCheckIns from './pages/SkinCheckIns';
import SkinJourney from './pages/SkinJourney';
import Profile from './pages/Profile';

import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import BrandPreview from './pages/BrandPreview';
import MockResults from './pages/MockResults';
import KlinikDesignPreview from './pages/KlinikDesignPreview';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';

// A component to branch the home route correctly inside the Router context
function HomeBranch() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PublicHome />;
}

function ScanBranch() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <AuthLayout>
        <Scan />
      </AuthLayout>
    );
  }
  return (
    <PublicLayout>
      <Scan />
    </PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Scan Route (Accessible to both authenticated users and guests) */}
          <Route path="/scan" element={<ScanBranch />} />

          {/* Authenticated Routes (App Shell) */}
          <Route element={<ProtectedRoute><AuthLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AuthHome />} />
            <Route path="/skin-check-ins" element={<SkinCheckIns />} />
            <Route path="/skin-journey" element={<SkinJourney />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Public Routes (Website Shell) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeBranch />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Design Previews */}
            <Route path="/brand-preview" element={<BrandPreview />} />
            <Route path="/mock-results" element={<MockResults />} />
            <Route path="/klinik-design-preview" element={<KlinikDesignPreview />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
