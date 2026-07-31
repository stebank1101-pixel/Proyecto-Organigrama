import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, getAuthToken, login as apiLogin, logout as apiLogout, setAuthToken } from "./api";
import type { UserProfile } from "../types";

const GUEST_STORAGE_KEY = "orgcraft.guestMode";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(GUEST_STORAGE_KEY) === "1");

  useEffect(() => {
    async function restoreSession() {
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetchMe();
        setUser(res.user);
      } catch {
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setAuthToken(res.token);
    setUser(res.user);
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setIsGuest(false);
  }, []);

  const logout = useCallback(() => {
    apiLogout().catch(() => {});
    setAuthToken(null);
    setUser(null);
  }, []);

  const enterGuestMode = useCallback(() => {
    localStorage.setItem(GUEST_STORAGE_KEY, "1");
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(() => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setIsGuest(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === "admin", isGuest, login, logout, enterGuestMode, exitGuestMode }),
    [user, loading, isGuest, login, logout, enterGuestMode, exitGuestMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
