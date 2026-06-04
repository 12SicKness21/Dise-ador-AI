"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/** Traduce los códigos de error de Firebase Auth a mensajes claros en español. */
function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El email no tiene un formato válido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Contacta al administrador.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisa tu internet e intenta de nuevo.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Verificar que la cuenta no esté suspendida (active === false)
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists() && snap.data().active === false) {
        await signOut(auth);
        setError("Tu cuenta está suspendida. Contacta al administrador para reactivarla.");
        return;
      }

      router.replace("/upload");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(authErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Logo_circulo.webp" alt="Moonkey IA" className="w-20 h-20 rounded-full object-cover mb-4" />
          <h1 className="text-2xl font-bold tracking-tight leading-none">Moonkey IA</h1>
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mt-1 mb-3">Studio</p>
          <p className="text-sm text-zinc-500">Ingresa con tu cuenta para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg border border-zinc-200 px-3 pr-10 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
