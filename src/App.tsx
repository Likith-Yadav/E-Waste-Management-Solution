import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { WasteDetection } from './components/WasteDetection';
import { MarketplacePage } from './components/MarketplacePage';
import { UserProfile } from './components/UserProfile';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in/*" element={<SignIn />} />
            <Route path="/sign-up/*" element={<SignUp />} />
            <Route path="/detection" element={<ProtectedRoute><WasteDetection /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ClerkProvider>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" />;
  }

  return <>{children}</>;
}

export default App;