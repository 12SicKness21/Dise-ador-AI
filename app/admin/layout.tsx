"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { LogOut, List, BarChart3, ShieldCheck, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/prompts", label: "Prompts",        icon: List },
  { href: "/admin/clients", label: "Clientes",        icon: Users },
  { href: "/admin/stats",   label: "Estadísticas",   icon: BarChart3 },
  { href: "/admin/admins",  label: "Administradores", icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isAdmin) router.replace("/upload");
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-100 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.webp" alt="Moonkey IA" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold text-sm tracking-tight">Moonkey IA</span>
          </div>
          <span className="text-zinc-300">·</span>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <a key={href} href={href}
                  className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}>
                  <Icon size={14} />
                  {label}
                </a>
              );
            })}
          </nav>
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

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
