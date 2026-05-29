"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { LogOut, List } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isAdmin) router.replace("/upload");
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.webp" alt="Moonkey IA" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold text-sm tracking-tight">Moonkey IA</span>
          </div>
          <span className="text-zinc-300">·</span>
          <a href="/admin/prompts" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition">
            <List size={14} />
            Prompts
          </a>
        </div>
        <button
          onClick={async () => { await signOut(auth); router.replace("/login"); }}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition"
          aria-label="Cerrar sesión"
        >
          <LogOut size={14} />
          Salir
        </button>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
