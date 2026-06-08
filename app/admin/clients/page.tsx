"use client";

import { useEffect, useState } from "react";
import {
  Loader2, UserPlus, Trash2, AlertCircle, Eye, EyeOff,
  ShieldCheck, User, Ban, CheckCircle2, KeyRound, CalendarClock, LogIn, X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  getClients, createClient, setClientActive, setClientRole, deleteClient,
  setClientPassword,
  type ClientProfile, type Role,
} from "@/lib/users";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("client");
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState("");
  const [ok, setOk]             = useState("");

  // Acciones por fila
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // Cambio de contraseña inline
  const [pwUid, setPwUid]         = useState<string | null>(null);
  const [newPass, setNewPass]     = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [pwBusy, setPwBusy]       = useState(false);
  const [pwError, setPwError]     = useState("");
  const [pwOk, setPwOk]           = useState<string | null>(null);

  function openPwForm(uid: string) {
    setPwUid(uid); setNewPass(""); setPwError(""); setPwOk(null); setShowNewPass(false);
  }

  async function handleChangePassword(c: ClientProfile) {
    setPwError("");
    if (newPass.length < 6) { setPwError("La contraseña debe tener al menos 6 caracteres."); return; }
    setPwBusy(true);
    try {
      await setClientPassword(c.uid, newPass);
      setPwUid(null);
      setPwOk(c.email);
      setTimeout(() => setPwOk(null), 4000);
    } catch {
      setPwError("No se pudo cambiar la contraseña.");
    } finally {
      setPwBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    try { setClients(await getClients()); }
    catch { setError("No se pudieron cargar los clientes."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setOk("");
    const clean = email.trim().toLowerCase();
    if (!clean.includes("@"))      { setError("Ingresa un email válido."); return; }
    if (password.length < 6)       { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setCreating(true);
    try {
      await createClient(clean, password, role);
      setOk(`Cuenta creada: ${clean}`);
      setEmail(""); setPassword(""); setRole("client");
      await load();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      setError(msg.includes("already") || msg.includes("existe")
        ? "Ya existe una cuenta con ese email."
        : "No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(c: ClientProfile) {
    setBusyUid(c.uid); setError("");
    try {
      await setClientActive(c.uid, !c.active);
      setClients(prev => prev.map(x => x.uid === c.uid ? { ...x, active: !c.active } : x));
    } catch { setError("No se pudo cambiar el estado."); }
    finally { setBusyUid(null); }
  }

  async function handleToggleRole(c: ClientProfile) {
    if (c.email === user?.email) { setError("No puedes cambiar tu propio rol."); return; }
    setBusyUid(c.uid); setError("");
    const next: Role = c.role === "admin" ? "client" : "admin";
    try {
      await setClientRole(c.uid, c.email, next);
      setClients(prev => prev.map(x => x.uid === c.uid ? { ...x, role: next } : x));
    } catch { setError("No se pudo cambiar el rol."); }
    finally { setBusyUid(null); }
  }

  async function handleDelete(c: ClientProfile) {
    if (c.email === user?.email) { setError("No puedes eliminar tu propia cuenta."); return; }
    if (!confirm(`¿Eliminar la cuenta de ${c.email}? Esta acción no se puede deshacer.`)) return;
    setBusyUid(c.uid); setError("");
    try {
      await deleteClient(c.uid);
      setClients(prev => prev.filter(x => x.uid !== c.uid));
    } catch { setError("No se pudo eliminar la cuenta."); }
    finally { setBusyUid(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Crea cuentas con su email y contraseña, define su rol y suspende el acceso cuando lo necesites.
        </p>
      </div>

      {/* ── Crear cuenta ── */}
      <form onSubmit={handleCreate} className="rounded-xl border border-zinc-100 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com" autoComplete="off"
            className="h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          />
          <div className="relative">
            <input
              type={showPass ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
              placeholder="Contraseña temporal (mín. 6)"
              className="w-full h-11 rounded-lg border border-zinc-200 px-3 pr-10 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label={showPass ? "Ocultar" : "Mostrar"}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Selector de rol */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-200">
            <button type="button" onClick={() => setRole("client")}
              className={`flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition ${
                role === "client" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <User size={14} /> Cliente
            </button>
            <button type="button" onClick={() => setRole("admin")}
              className={`flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition ${
                role === "admin" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <ShieldCheck size={14} /> Administrador
            </button>
          </div>

          <button type="submit" disabled={creating}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Crear cuenta
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {ok && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-700">{ok}</p>
          </div>
        )}
      </form>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      ) : clients.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-8">Todavía no hay cuentas creadas.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.uid}
              className="rounded-xl border border-zinc-100 overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  c.role === "admin" ? "bg-emerald-50" : "bg-zinc-100"}`}>
                  {c.role === "admin"
                    ? <ShieldCheck size={16} className="text-emerald-600" />
                    : <User size={16} className="text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{c.email}</p>
                    {c.email === user?.email && (
                      <span className="text-[10px] text-zinc-400">(tú)</span>
                    )}
                    {!c.active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                        Suspendida
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {c.role === "admin" ? "Administrador" : "Cliente"} · creado por {c.createdBy}
                  </p>
                  {/* Fechas */}
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <CalendarClock size={12} className="text-zinc-400" />
                      Creado: {fmtDate(c.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <LogIn size={12} className="text-zinc-400" />
                      Último acceso: {fmtDate(c.lastSignInAt)}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => pwUid === c.uid ? setPwUid(null) : openPwForm(c.uid)}
                    disabled={busyUid === c.uid}
                    title="Cambiar contraseña"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition disabled:opacity-30 ${
                      pwUid === c.uid
                        ? "text-blue-600 bg-blue-50"
                        : "text-zinc-400 hover:text-blue-600 hover:bg-blue-50"}`}>
                    <KeyRound size={15} />
                  </button>
                  <button onClick={() => handleToggleRole(c)}
                    disabled={busyUid === c.uid || c.email === user?.email}
                    title={c.role === "admin" ? "Quitar admin" : "Hacer admin"}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-30 disabled:hover:bg-transparent">
                    <ShieldCheck size={15} />
                  </button>
                  <button onClick={() => handleToggleActive(c)}
                    disabled={busyUid === c.uid}
                    title={c.active ? "Suspender" : "Reactivar"}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition disabled:opacity-30">
                    {busyUid === c.uid ? <Loader2 size={14} className="animate-spin" />
                      : c.active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                  <button onClick={() => handleDelete(c)}
                    disabled={busyUid === c.uid || c.email === user?.email}
                    title="Eliminar"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Confirmación de cambio de contraseña */}
              {pwOk === c.email && (
                <div className="flex items-center gap-2 px-3 pb-3">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700">Contraseña actualizada.</p>
                </div>
              )}

              {/* Formulario inline de cambio de contraseña */}
              {pwUid === c.uid && (
                <div className="border-t border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound size={13} className="text-blue-600" />
                    <p className="text-xs font-medium text-zinc-700">
                      Nueva contraseña para {c.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 pr-9 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                      />
                      <button type="button" onClick={() => setShowNewPass(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        aria-label={showNewPass ? "Ocultar" : "Mostrar"}>
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button onClick={() => handleChangePassword(c)} disabled={pwBusy}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 shrink-0">
                      {pwBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                      Guardar
                    </button>
                    <button onClick={() => setPwUid(null)} disabled={pwBusy}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition shrink-0"
                      aria-label="Cancelar">
                      <X size={15} />
                    </button>
                  </div>
                  {pwError && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <AlertCircle size={13} className="text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{pwError}</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
