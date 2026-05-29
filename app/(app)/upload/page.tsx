"use client";

import { useRef, useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, Timestamp } from "firebase/firestore";
import {
  Camera, ImagePlus, Download, X, Loader2,
  Shield, LogOut, AlertCircle, Check,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { uploadOriginal } from "@/lib/storage";
import { createOrder } from "@/lib/orders";
import { getActivePrompts, type Prompt } from "@/lib/prompts";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";

interface ResolvedResult { name: string; httpsUrl: string; }
type Phase = "select" | "ready" | "uploading" | "processing" | "done" | "error";

/**
 * Convierte el nombre del prompt al slug del archivo en /public/styles/
 * Ej: "MODELO CATÁLOGO" → "/styles/modelo-catalogo.webp"
 */
function styleImage(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/styles/${slug}.webp`;
}

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // nombre del prompt seleccionado

  const [phase, setPhase]         = useState<Phase>("select");
  const [progress, setProgress]   = useState(0);
  const [orderId, setOrderId]     = useState<string | null>(null);
  const [order, setOrder]         = useState<Order | null>(null);
  const [results, setResults]     = useState<ResolvedResult[]>([]);
  const [resolving, setResolving] = useState(false);
  const [dlLoading, setDlLoading] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg]   = useState("");

  useEffect(() => {
    getActivePrompts().then(setPrompts).catch(console.error);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const o: Order = {
        id: snap.id, uid: d.uid, status: d.status,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
        error: d.error ?? null, results: d.results ?? {},
      };
      setOrder(o);
      if (o.status === "done")  setPhase("done");
      if (o.status === "error") { setErrorMsg(o.error ?? "Error al generar."); setPhase("error"); }
    });
    return unsub;
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "done") return;
    const entries = Object.entries(order.results).filter(([, v]) => v !== "error");
    if (!entries.length) return;
    setResolving(true);
    Promise.all(entries.map(async ([name, gsPath]) => ({
      name, httpsUrl: await resolveGsUrl(gsPath),
    }))).then(setResults).catch(console.error).finally(() => setResolving(false));
  }, [order]);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) { setErrorMsg("Solo se aceptan imágenes."); return; }
    if (f.size > 10 * 1024 * 1024)   { setErrorMsg("La imagen debe pesar menos de 10 MB."); return; }
    setErrorMsg(""); setFile(f); setPreview(URL.createObjectURL(f)); setPhase("ready");
  }

  function handleClear() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setPhase("select"); setProgress(0); setErrorMsg("");
    setOrderId(null); setOrder(null); setResults([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleGenerate() {
    if (!file || !user || !selected) return;
    setPhase("uploading"); setErrorMsg("");
    try {
      const id = await createOrder(user.uid, selected);
      setOrderId(id);
      await uploadOriginal(user.uid, id, file, setProgress);
      setPhase("processing");
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al subir la foto. Intenta de nuevo.");
      setPhase("ready"); setProgress(0);
    }
  }

  async function handleDownload(url: string, name: string) {
    setDlLoading(p => ({ ...p, [name]: true }));
    try { await dlImg(url, `zapatilla_${name.toLowerCase().replace(/\s+/g, "_")}.png`); }
    catch { window.open(url, "_blank", "noopener"); }
    finally { setDlLoading(p => ({ ...p, [name]: false })); }
  }

  async function handleSignOut() {
    await signOut(auth); router.replace("/login");
  }

  const canGenerate = phase === "ready" && selected !== null;

  /* ──────────── RENDER ──────────── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F2EC" }}>

      {/* Header Obsidiana */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#2D2B2D" }}>
        <span className="text-sm font-semibold text-white tracking-wide">Zapatillas Studio</span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/admin/prompts" className="flex items-center gap-1 text-xs transition"
              style={{ color: "#A8C4D4" }}>
              <Shield size={13} /> Admin
            </a>
          )}
          <button onClick={handleSignOut} className="flex items-center gap-1 text-xs transition"
            style={{ color: "#C8BAA8" }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5">

        {/* ── SUBIR IMAGEN ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[.18em] mb-2.5"
            style={{ color: "#2D2B2D" }}>
            Subir imagen
          </p>

          {phase === "select" ? (
            <div className="grid grid-cols-2 gap-3">
              <input ref={inputRef} type="file" accept="image/*" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
                <Camera size={22} style={{ color: "#A8C4D4" }} />
                <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Cámara</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              <label onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
                <ImagePlus size={22} style={{ color: "#A8C4D4" }} />
                <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Galería</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border p-3"
              style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview!} alt="Zapatilla"
                className="w-16 h-16 rounded-xl object-cover shrink-0"
                style={{ backgroundColor: "#C8BAA8" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
                  Imagen de zapatilla original
                </p>
                {phase === "uploading" && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#E8E0D8" }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, backgroundColor: "#A8C4D4" }} />
                  </div>
                )}
                {phase === "ready" && (
                  <button onClick={handleClear}
                    className="mt-1 text-xs font-medium hover:opacity-70 transition"
                    style={{ color: "#A8C4D4" }}>
                    Cambiar imagen
                  </button>
                )}
              </div>
              {phase === "ready" && (
                <button onClick={handleClear}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: "#F0EBE3", color: "#B39C80" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── ESTILOS — selección única ── */}
        {(phase === "ready" || phase === "uploading") && prompts.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[.18em] mb-2.5"
              style={{ color: "#2D2B2D" }}>
              Elegir estilo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {prompts.map((p) => {
                const isSelected = selected === p.name;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.name)}
                    className="flex flex-col rounded-2xl overflow-hidden transition-all active:scale-[0.97] relative"
                    style={{
                      backgroundColor: "white",
                      border: isSelected
                        ? "2.5px solid #A8C4D4"   /* Glaciar seleccionado */
                        : "1.5px solid #C8BAA8",   /* Piedra Lunar normal */
                      boxShadow: isSelected
                        ? "0 0 0 3px #A8C4D420"   /* glow sutil Glaciar */
                        : "none",
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="w-full aspect-square overflow-hidden"
                      style={{ backgroundColor: "#E8DDD0" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={styleImage(p.name)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>

                    {/* Nombre */}
                    <p className="text-[10px] font-bold uppercase tracking-wide text-center py-2 px-1 leading-tight"
                      style={{ color: isSelected ? "#A8C4D4" : "#2D2B2D" }}>
                      {p.name}
                    </p>

                    {/* Checkmark seleccionado */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#A8C4D4" }}>
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {!selected && (
              <p className="text-xs mt-2 text-center" style={{ color: "#B39C80" }}>
                Selecciona un estilo para continuar
              </p>
            )}
          </section>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ backgroundColor: "#FEF0ED", border: "1px solid #F5856A33" }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
            <p className="text-sm" style={{ color: "#C45A42" }}>{errorMsg}</p>
          </div>
        )}

        {/* ── GENERAR CON IA ── */}
        {phase === "ready" && (
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white"
            style={{
              backgroundColor: canGenerate ? "#2D2B2D" : "#C8BAA8",
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}>
            GENERAR CON IA
          </button>
        )}

        {/* ── SUBIENDO ── */}
        {phase === "uploading" && (
          <div className="w-full h-14 rounded-full flex items-center justify-center gap-2.5 text-white"
            style={{ backgroundColor: "#2D2B2D" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="font-bold text-sm tracking-[.12em]">SUBIENDO...</span>
          </div>
        )}

        {/* ── PROCESANDO ── */}
        {phase === "processing" && (
          <div className="rounded-2xl border p-7 flex flex-col items-center gap-3"
            style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#E8F2F7" }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "#A8C4D4" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
                Generando con IA...
              </p>
              <p className="text-xs mt-1" style={{ color: "#B39C80" }}>
                Estilo: <strong>{selected}</strong>
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {phase === "done" && (
          <section className="space-y-4">
            {resolving ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: "#A8C4D4" }} />
              </div>
            ) : (
              <>
                {results.map((r) => (
                  <div key={r.name} className="space-y-2.5">
                    <div className="relative rounded-2xl overflow-hidden"
                      style={{ backgroundColor: "#C8BAA8" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.httpsUrl} alt={r.name}
                        className="w-full aspect-square object-cover" loading="lazy" />
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: "#F5856A" }}>
                        Generado por IA
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(r.httpsUrl, r.name)}
                      disabled={dlLoading[r.name]}
                      className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: "#A8C4D4", color: "#2D2B2D" }}>
                      {dlLoading[r.name]
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Download size={15} />}
                      DESCARGAR IMAGEN
                    </button>
                  </div>
                ))}

                {order && Object.entries(order.results)
                  .filter(([, v]) => v === "error")
                  .map(([name]) => (
                    <p key={name} className="text-xs flex items-center gap-1.5"
                      style={{ color: "#F5856A" }}>
                      <AlertCircle size={12} /> {name}: no se pudo generar.
                    </p>
                  ))}

                <button onClick={handleClear}
                  className="w-full text-sm py-1 text-center transition hover:opacity-70"
                  style={{ color: "#2D2B2D" }}>
                  Volver
                </button>
              </>
            )}
          </section>
        )}

        {/* Error total */}
        {phase === "error" && (
          <button onClick={handleClear}
            className="w-full text-sm py-1 text-center hover:opacity-70 transition"
            style={{ color: "#A8C4D4" }}>
            ← Intentar de nuevo
          </button>
        )}

        {(phase === "select" || phase === "ready") && (
          <p className="text-center text-xs pt-1">
            <a href="/orders" className="hover:opacity-70 transition" style={{ color: "#8DAF9A" }}>
              Ver pedidos anteriores →
            </a>
          </p>
        )}

      </div>
    </div>
  );
}
