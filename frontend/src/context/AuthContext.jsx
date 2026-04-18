import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  const profile = user.profile || {};
  const firstName = user.firstName ?? profile.firstName ?? '';
  const lastName = user.lastName ?? profile.lastName ?? '';

  return {
    ...user,
    firstName,
    lastName,
    profile: {
      ...profile,
      firstName: profile.firstName ?? firstName,
      lastName: profile.lastName ?? lastName,
    },
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('srrss_user');
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch user on mount (cookies handle auth)
  useEffect(() => {
    authAPI.me()
      .then(res => {
        const normalizedUser = normalizeUser(res.data.user);
        setUser(normalizedUser);
        localStorage.setItem('srrss_user', JSON.stringify(normalizedUser));
      })
      .catch(() => {
        localStorage.removeItem('srrss_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const normalizedUser = normalizeUser(res.data.user);
    localStorage.setItem('srrss_user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const normalizedUser = normalizeUser(res.data.user);
    if (res.data.requiresEmailVerification) {
      localStorage.removeItem('srrss_user');
      setUser(null);
      return {
        verificationRequired: true,
        email: normalizedUser?.email || data.email,
      };
    }
    localStorage.setItem('srrss_user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Best-effort: server request may fail, still clear local state
    }
    localStorage.removeItem('srrss_user');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isRecruiter: user?.role === 'recruiter',
    isAdmin: user?.role === 'admin',
    isCandidate: user?.role === 'candidate',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
