"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { LogOut, Shield } from "lucide-react";
import { PromptSelector } from "@/components/upload/PromptSelector";
import { CameraUpload } from "@/components/upload/CameraUpload";

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-sm mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold tracking-tight">Zapatillas Studio</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/admin/prompts"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition"
              aria-label="Panel admin"
            >
              <Shield size={13} />
              Admin
            </a>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition"
            aria-label="Cerrar sesión"
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-1">
            Subí tu zapatilla
          </h2>
          <p className="text-sm text-zinc-500">
            La IA generará fotos profesionales automáticamente.
          </p>
        </div>

        {/* Estilos activos */}
        <PromptSelector />

        {/* Upload */}
        <CameraUpload />
      </div>
    </div>
  );
}
