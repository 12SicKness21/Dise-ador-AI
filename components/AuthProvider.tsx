"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { checkIsAdmin } from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  credits: number | null;   // null mientras carga; número una vez resuelto
  plan: string | null;      // plan actual del usuario
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  credits: null,
  plan: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan]       = useState<string | null>(null);

  // Estado de autenticación
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAdmin(await checkIsAdmin(u));
      setLoading(false);
    });
  }, []);

  // Saldo de créditos y plan en tiempo real (un solo listener para toda la app)
  useEffect(() => {
    if (!user) { setCredits(null); setPlan(null); return; }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const d = snap.data();
        setCredits(typeof d?.credits === "number" ? d.credits : 0);
        setPlan(typeof d?.plan === "string" ? d.plan : "free");
      },
      () => { setCredits(0); setPlan("free"); }
    );
    return unsub;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, credits, plan }}>
      {children}
    </AuthContext.Provider>
  );
}
