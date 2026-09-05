import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiFetch, setToken, clearToken, isAuthenticated } from "../lib/api";

interface AdminInfo {
  id: string;
  username: string;
  namaLengkap: string;
  role: string;
  assignedGender: string;
  assignedUnit: string | null;
}

interface AuthContextValue {
  admin: AdminInfo | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  restoring: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; admin: AdminInfo }>("/auth/login", {
        method: "POST",
        jsonBody: { username, password },
      });
      setToken(res.token);
      setAdmin(res.admin);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  // Restore session on mount — must be useEffect, not useState
  useEffect(() => {
    if (!isAuthenticated()) {
      setRestoring(false);
      return;
    }
    apiFetch<{ admin: AdminInfo }>("/admin/me", { auth: true })
      .then((res) => setAdmin(res.admin))
      .catch(() => clearToken())
      .finally(() => setRestoring(false));
  }, []);

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading, restoring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
