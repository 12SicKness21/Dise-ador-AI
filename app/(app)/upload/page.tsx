"use client";

import { useRef, useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, Timestamp } from "firebase/firestore";
import {
  Camera, ImagePlus, Download, X, Loader2,
  Shield, LogOut, AlertCircle,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { uploadOriginal } from "@/lib/storage";
import { createOrder } from "@/lib/orders";
import { getActivePrompts, type Prompt } from "@/lib/prompts";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";

/*
  Paleta Google Pixel
  ───────────────────
  Glaciar      #A8C4D4   azul hielo
  Piedra Lunar #C8BAA8   gris cálido
  Obsidiana    #2D2B2D   negro profundo
  Coral        #F5856A   salmón cálido
  Sage         #8DAF9A   verde salvia
  Porcelana    #F5F2EC   blanco cálido (fondo)
  Avellana     #B39C80   marrón cálido
*/

interface ResolvedResult { name: string; httpsUrl: string; }
type Phase = "select" | "ready" | "uploading" | "processing" | "done" | "error";

const STYLE_IMAGES: Record<string, string> = {
  "FONDO BLANCO":    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80",
  "MODELO DE PIE":   "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=300&q=80",
  "MODELO AGACHADO": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80",
};

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

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
    if (!file || !user) return;
    setPhase("uploading"); setErrorMsg("");
    try {
      const id = await createOrder(user.uid);
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

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F2EC" /* Porcelana */ }}>

      {/* ── Header Obsidiana ── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#2D2B2D" /* Obsidiana */ }}
      >
        <span className="text-sm font-semibold text-white tracking-wide">
          Zapatillas Studio
        </span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/admin/prompts"
              className="flex items-center gap-1 text-xs transition"
              style={{ color: "#A8C4D4" /* Glaciar */ }}>
              <Shield size={13} /> Admin
            </a>
          )}
          <button onClick={handleSignOut}
            className="flex items-center gap-1 text-xs transition"
            style={{ color: "#C8BAA8" /* Piedra Lunar */ }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5">

        {/* ── SECCIÓN: SUBIR IMAGEN ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[.18em] mb-3"
            style={{ color: "#2D2B2D" /* Obsidiana */ }}>
            Subir imagen
          </p>

          {phase === "select" ? (
            <div className="grid grid-cols-2 gap-3">
              <input ref={inputRef} type="file" accept="image/*" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {/* Cámara */}
              <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                style={{ backgroundColor: "white", borderColor: "#C8BAA8" /* Piedra Lunar */ }}>
                <Camera size={22} style={{ color: "#A8C4D4" /* Glaciar */ }} />
                <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Cámara</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>

              {/* Galería */}
              <label onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                style={{ backgroundColor: "white", borderColor: "#C8BAA8" /* Piedra Lunar */ }}>
                <ImagePlus size={22} style={{ color: "#A8C4D4" /* Glaciar */ }} />
                <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Galería</span>
              </label>
            </div>
          ) : (
            /* Tarjeta imagen seleccionada */
            <div className="flex items-center gap-3 rounded-2xl border p-3"
              style={{ backgroundColor: "white", borderColor: "#C8BAA8" /* Piedra Lunar */ }}>
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
                      style={{ width: `${progress}%`, backgroundColor: "#A8C4D4" /* Glaciar */ }} />
                  </div>
                )}
                {phase === "ready" && (
                  <button onClick={handleClear}
                    className="mt-1 text-xs font-medium hover:opacity-70 transition"
                    style={{ color: "#A8C4D4" /* Glaciar */ }}>
                    Cambiar imagen
                  </button>
                )}
              </div>
              {phase === "ready" && (
                <button onClick={handleClear}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: "#F0EBE3", color: "#B39C80" /* Avellana */ }}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── SECCIÓN: ESTILOS ── */}
        {(phase === "ready" || phase === "uploading") && prompts.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {prompts.map((p) => {
              const thumb = STYLE_IMAGES[p.name.toUpperCase().trim()];
              return (
                <div key={p.id} className="flex flex-col rounded-2xl border overflow-hidden"
                  style={{ backgroundColor: "white", borderColor: "#C8BAA8" /* Piedra Lunar */ }}>
                  <div className="w-full aspect-square overflow-hidden"
                    style={{ backgroundColor: "#E8DDD0" /* Piedra Lunar claro */ }}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">👟</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-center py-2 px-1 leading-tight"
                    style={{ color: "#2D2B2D" /* Obsidiana */ }}>
                    {p.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Error ── */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ backgroundColor: "#FEF0ED", border: "1px solid #F5856A33" }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" /* Coral */ }} />
            <p className="text-sm" style={{ color: "#C45A42" }}>{errorMsg}</p>
          </div>
        )}

        {/* ── CTA: GENERAR CON IA ── */}
        {phase === "ready" && (
          <button onClick={handleGenerate}
            className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white"
            style={{ backgroundColor: "#2D2B2D" /* Obsidiana */ }}>
            GENERAR CON IA
          </button>
        )}

        {/* ── SUBIENDO ── */}
        {phase === "uploading" && (
          <div className="w-full h-14 rounded-full flex items-center justify-center gap-2.5 text-white"
            style={{ backgroundColor: "#2D2B2D" /* Obsidiana */ }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="font-bold text-sm tracking-[.12em]">SUBIENDO...</span>
          </div>
        )}

        {/* ── PROCESANDO ── */}
        {phase === "processing" && (
          <div className="rounded-2xl border p-7 flex flex-col items-center gap-3"
            style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#E8F2F7" /* Glaciar tenue */ }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "#A8C4D4" /* Glaciar */ }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
                Generando con IA...
              </p>
              <p className="text-xs mt-1" style={{ color: "#B39C80" /* Avellana */ }}>
                Esto puede tomar unos segundos
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
                    {/* Imagen generada */}
                    <div className="relative rounded-2xl overflow-hidden"
                      style={{ backgroundColor: "#C8BAA8" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.httpsUrl} alt={r.name}
                        className="w-full aspect-square object-cover" loading="lazy" />
                      {/* Badge Coral */}
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: "#F5856A" /* Coral */ }}>
                        Generado por IA
                      </span>
                    </div>

                    {/* Botón descargar — Glaciar */}
                    <button
                      onClick={() => handleDownload(r.httpsUrl, r.name)}
                      disabled={dlLoading[r.name]}
                      className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: "#A8C4D4" /* Glaciar */, color: "#2D2B2D" /* Obsidiana */ }}>
                      {dlLoading[r.name]
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Download size={15} />}
                      DESCARGAR IMAGEN
                    </button>
                  </div>
                ))}

                {/* Errores parciales */}
                {order && Object.entries(order.results)
                  .filter(([, v]) => v === "error")
                  .map(([name]) => (
                    <p key={name} className="text-xs flex items-center gap-1.5"
                      style={{ color: "#F5856A" /* Coral */ }}>
                      <AlertCircle size={12} /> {name}: no se pudo generar.
                    </p>
                  ))}

                <button onClick={handleClear}
                  className="w-full text-sm py-1 text-center transition hover:opacity-70"
                  style={{ color: "#2D2B2D" /* Obsidiana */ }}>
                  Volver
                </button>
              </>
            )}
          </section>
        )}

        {/* ── Error total ── */}
        {phase === "error" && (
          <button onClick={handleClear}
            className="w-full text-sm py-1 text-center hover:opacity-70 transition"
            style={{ color: "#A8C4D4" /* Glaciar */ }}>
            ← Intentar de nuevo
          </button>
        )}

        {/* ── Ver pedidos anteriores ── */}
        {(phase === "select" || phase === "ready") && (
          <p className="text-center text-xs pt-1">
            <a href="/orders"
              className="hover:opacity-70 transition"
              style={{ color: "#8DAF9A" /* Sage */ }}>
              Ver pedidos anteriores →
            </a>
          </p>
        )}

      </div>
    </div>
  );
}
