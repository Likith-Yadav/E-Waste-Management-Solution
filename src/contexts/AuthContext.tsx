import { createContext, useContext } from 'react';
import { useUser } from '@clerk/clerk-react';

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  isLoaded: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn = false, isLoaded = false } = useUser();

  return (
    <AuthContext.Provider value={{ 
      isSignedIn: Boolean(isSignedIn),
      isLoaded: Boolean(isLoaded)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 