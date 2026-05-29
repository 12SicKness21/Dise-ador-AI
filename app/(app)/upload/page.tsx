"use client";

import { useRef, useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, Timestamp } from "firebase/firestore";
import {
  Camera, ImagePlus, Download, X, Loader2,
  Shield, LogOut, Sparkles, AlertCircle,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { uploadOriginal } from "@/lib/storage";
import { createOrder } from "@/lib/orders";
import { getActivePrompts, type Prompt } from "@/lib/prompts";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";

interface ResolvedResult {
  name: string;
  httpsUrl: string;
}

type Phase = "select" | "ready" | "uploading" | "processing" | "done" | "error";

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  /* ── imagen ─────────────────────────────── */
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  /* ── prompts ─────────────────────────────── */
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  /* ── flujo ───────────────────────────────── */
  const [phase, setPhase] = useState<Phase>("select");
  const [progress, setProgress] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [results, setResults] = useState<ResolvedResult[]>([]);
  const [resolving, setResolving] = useState(false);
  const [dlLoading, setDlLoading] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState("");

  /* cargar prompts activos */
  useEffect(() => {
    getActivePrompts().then(setPrompts).catch(console.error);
  }, []);

  /* escuchar pedido en tiempo real */
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const o: Order = {
        id: snap.id,
        uid: d.uid,
        status: d.status,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
        error: d.error ?? null,
        results: d.results ?? {},
      };
      setOrder(o);
      if (o.status === "done") setPhase("done");
      if (o.status === "error") {
        setErrorMsg(o.error ?? "Error al generar las imágenes.");
        setPhase("error");
      }
    });
    return unsub;
  }, [orderId]);

  /* resolver URLs cuando el pedido esté listo */
  useEffect(() => {
    if (!order || order.status !== "done") return;
    const entries = Object.entries(order.results).filter(([, v]) => v !== "error");
    if (!entries.length) return;
    setResolving(true);
    Promise.all(
      entries.map(async ([name, gsPath]) => ({
        name,
        httpsUrl: await resolveGsUrl(gsPath),
      }))
    )
      .then(setResults)
      .catch(console.error)
      .finally(() => setResolving(false));
  }, [order]);

  /* ── handlers ────────────────────────────── */
  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) { setErrorMsg("Solo se aceptan imágenes."); return; }
    if (f.size > 10 * 1024 * 1024) { setErrorMsg("La imagen debe pesar menos de 10 MB."); return; }
    setErrorMsg("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase("ready");
  }

  function handleClear() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhase("select");
    setProgress(0);
    setErrorMsg("");
    setOrderId(null);
    setOrder(null);
    setResults([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleGenerate() {
    if (!file || !user) return;
    setPhase("uploading");
    setErrorMsg("");
    try {
      const id = await createOrder(user.uid);
      setOrderId(id);
      await uploadOriginal(user.uid, id, file, setProgress);
      setPhase("processing");
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al subir la foto. Intenta de nuevo.");
      setPhase("ready");
      setProgress(0);
    }
  }

  async function handleDownload(url: string, name: string) {
    setDlLoading((p) => ({ ...p, [name]: true }));
    try {
      await dlImg(url, `zapatilla_${name.toLowerCase().replace(/\s+/g, "_")}.png`);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally {
      setDlLoading((p) => ({ ...p, [name]: false }));
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  /* ── render ──────────────────────────────── */
  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
        <span className="text-sm font-semibold text-stone-800 tracking-tight">
          Zapatillas Studio
        </span>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/admin/prompts"
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition"
            >
              <Shield size={13} /> Admin
            </a>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* ── Contenido ── */}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* ── Sección: Subir imagen ── */}
        <section>
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[.15em] mb-2.5">
            Subir imagen
          </p>

          {phase === "select" ? (
            /* Sin imagen: botones cámara / galería */
            <div className="grid grid-cols-2 gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <label className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition min-h-[110px]">
                <Camera size={22} className="text-stone-400" />
                <span className="text-sm font-medium text-stone-600">Cámara</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              <label
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition min-h-[110px]"
              >
                <ImagePlus size={22} className="text-stone-400" />
                <span className="text-sm font-medium text-stone-600">Galería</span>
              </label>
            </div>
          ) : (
            /* Con imagen: tarjeta horizontal */
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-stone-200 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview!}
                alt="Zapatilla"
                className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700">
                  Imagen de zapatilla original
                </p>
                {phase === "uploading" && (
                  <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {(phase === "ready") && (
                  <button
                    onClick={handleClear}
                    className="mt-1 text-xs text-stone-400 hover:text-stone-600 transition"
                  >
                    Cambiar imagen
                  </button>
                )}
              </div>
              {phase === "ready" && (
                <button
                  onClick={handleClear}
                  className="shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-200 transition"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Sección: Estilos ── */}
        {(phase === "ready" || phase === "uploading") && prompts.length > 0 && (
          <section>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[.15em] mb-2.5">
              Estilos a generar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {prompts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl border border-stone-200"
                >
                  <div className="w-full aspect-square rounded-lg bg-stone-100 flex items-center justify-center">
                    <Sparkles size={16} className="text-orange-400" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide text-center leading-tight px-0.5">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Error ── */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-500">{errorMsg}</p>
          </div>
        )}

        {/* ── CTA: Generar ── */}
        {phase === "ready" && (
          <button
            onClick={handleGenerate}
            className="w-full h-14 rounded-2xl bg-stone-900 text-white font-bold text-sm tracking-[.1em] hover:bg-stone-700 active:scale-[0.98] transition"
          >
            GENERAR CON IA
          </button>
        )}

        {/* ── Subiendo ── */}
        {phase === "uploading" && (
          <div className="w-full h-14 rounded-2xl bg-stone-900 flex items-center justify-center gap-2.5">
            <Loader2 size={16} className="animate-spin text-white" />
            <span className="text-white font-bold text-sm tracking-[.1em]">SUBIENDO...</span>
          </div>
        )}

        {/* ── Procesando ── */}
        {phase === "processing" && (
          <div className="bg-white rounded-2xl border border-stone-200 p-7 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-orange-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-stone-800">Generando con IA...</p>
              <p className="text-xs text-stone-400 mt-1">Esto puede tomar unos segundos</p>
            </div>
          </div>
        )}

        {/* ── Resultados ── */}
        {phase === "done" && (
          <section className="space-y-4">
            {resolving ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-stone-400" />
              </div>
            ) : (
              <>
                {results.map((r) => (
                  <div key={r.name} className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.httpsUrl}
                        alt={r.name}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wide">
                        Generado por IA
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(r.httpsUrl, r.name)}
                      disabled={dlLoading[r.name]}
                      className="w-full h-12 rounded-2xl bg-stone-900 text-white font-bold text-sm tracking-[.08em] flex items-center justify-center gap-2 hover:bg-stone-700 active:scale-[0.98] transition disabled:opacity-50"
                    >
                      {dlLoading[r.name]
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Download size={15} />}
                      DESCARGAR IMAGEN
                    </button>
                  </div>
                ))}

                {/* errores parciales */}
                {order && Object.entries(order.results)
                  .filter(([, v]) => v === "error")
                  .map(([name]) => (
                    <p key={name} className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle size={12} /> {name}: no se pudo generar.
                    </p>
                  ))}

                <button
                  onClick={handleClear}
                  className="w-full text-sm text-stone-500 hover:text-stone-800 transition py-1"
                >
                  ← Nueva foto
                </button>
              </>
            )}
          </section>
        )}

        {/* ── Error total ── */}
        {phase === "error" && (
          <button
            onClick={handleClear}
            className="w-full text-sm text-stone-500 hover:text-stone-800 transition py-1"
          >
            ← Intentar de nuevo
          </button>
        )}

        {/* ── Link pedidos anteriores ── */}
        {(phase === "select" || phase === "ready") && (
          <p className="text-center text-xs text-stone-400 pt-1">
            <a href="/orders" className="hover:text-stone-600 transition">
              Ver pedidos anteriores →
            </a>
          </p>
        )}

      </div>
    </div>
  );
}
