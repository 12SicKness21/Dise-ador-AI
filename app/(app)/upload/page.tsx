"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { LogOut, Shield, User } from "lucide-react";

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-8 max-w-sm mx-auto">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-lg font-semibold tracking-tight">Zapatillas Studio</h1>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition"
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} />
          Salir
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
          {isAdmin ? (
            <Shield size={28} className="text-zinc-700" />
          ) : (
            <User size={28} className="text-zinc-700" />
          )}
        </div>

        <div>
          <p className="text-sm text-zinc-500 mb-1">Conectado como</p>
          <p className="font-medium text-zinc-900">{user?.email}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
            {isAdmin ? "Admin" : "Cliente"}
          </span>
        </div>

        {isAdmin && (
          <a
            href="/admin/prompts"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Ir al panel de admin →
          </a>
        )}

        <p className="text-xs text-zinc-400 mt-4">
          Subida de fotos disponible en Fase 3
        </p>
      </div>
    </div>
  );
}
