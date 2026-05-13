import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { UserRole } from '@sandbox/types';
import { getToken, setToken } from '../services/api.service';
import { login as loginRequest, me as meRequest } from '../services/auth.service';

interface AuthUser {
  id: string;
  email: string;
  roles: UserRole[];
  craftsmanId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    meRequest()
      .then((claims) =>
        setUser({
          id: claims.sub,
          email: claims.email,
          roles: claims.roles,
          craftsmanId: claims.craftsmanId,
        }),
      )
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const doLogin = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const doLogout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login: doLogin, logout: doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
