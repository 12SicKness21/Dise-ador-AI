"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getAdmins, addAdmin, removeAdmin, type AdminEntry } from "@/lib/admins";

export default function AdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins]   = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [error, setError]     = useState("");

  async function load() {
    setLoading(true);
    try { setAdmins(await getAdmins()); }
    catch { setError("No se pudieron cargar los administradores."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Ingresa un email válido.");
      return;
    }
    if (admins.some((a) => a.email === clean)) {
      setError("Ese email ya es administrador.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await addAdmin(clean, user?.email ?? "—");
      setEmail("");
      await load();
    } catch {
      setError("No se pudo agregar. Verifica tus permisos.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(target: string) {
    if (target === user?.email) {
      setError("No puedes quitarte a ti mismo como administrador.");
      return;
    }
    if (!confirm(`¿Quitar a ${target} como administrador?`)) return;
    setRemovingEmail(target);
    try {
      await removeAdmin(target);
      setAdmins((prev) => prev.filter((a) => a.email !== target));
    } catch {
      setError("No se pudo quitar el administrador.");
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Administradores</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Quienes aparecen aquí pueden gestionar prompts, ver estadísticas y administrar este panel.
        </p>
      </div>

      {/* Agregar admin */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nuevo-admin@email.com"
          className="flex-1 h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
        <button
          type="submit"
          disabled={adding}
          className="flex items-center gap-1.5 h-11 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      ) : (
        <ul className="space-y-2">
          {admins.map((a) => (
            <li key={a.email}
              className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-50">
                <ShieldCheck size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.email}</p>
                <p className="text-xs text-zinc-400">
                  {a.email === user?.email ? "Tú · " : ""}Agregado por {a.addedBy}
                </p>
              </div>
              <button
                onClick={() => handleRemove(a.email)}
                disabled={removingEmail === a.email || a.email === user?.email}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                aria-label="Quitar administrador"
              >
                {removingEmail === a.email
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
