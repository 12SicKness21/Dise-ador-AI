"use client";

import { useRef, useState, useEffect } from "react";

// ── Mensajes animados durante el procesado de IA ──────────────────────────────
const PROCESSING_STEPS = [
  "Analizando el producto...",
  "Detectando forma y colores...",
  "Aplicando el estilo...",
  "Generando imagen...",
  "Ajustando los detalles finales...",
] as const;

function useProcessingMessage(active: boolean): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const t = setInterval(
      () => setIdx(p => (p + 1) % PROCESSING_STEPS.length),
      2600
    );
    return () => clearInterval(t);
  }, [active]);
  return PROCESSING_STEPS[idx];
}
// ─────────────────────────────────────────────────────────────────────────────
import { LogoLoader } from "@/components/LogoLoader";
import { ImageWithLoader } from "@/components/ImageWithLoader";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, Timestamp } from "firebase/firestore";
import {
  Camera, ImagePlus, Download, X, Loader2,
  Shield, LogOut, AlertCircle, Check, Plus,
  Lightbulb, MessageCircle, Sparkles, ShieldCheck, Zap, Scissors,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { CreditBadge } from "@/components/CreditBadge";
import { UpgradeModal } from "@/components/UpgradeModal";
import { BackgroundRemoval } from "@/components/BackgroundRemoval";
import { uploadOriginal } from "@/lib/storage";
import { createOrder } from "@/lib/orders";
import { getActivePrompts, type Prompt } from "@/lib/prompts";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";

/*
  Paleta Google Pixel
  Obsidiana    #2D2B2D   negro profundo
  Glaciar      #A8C4D4   azul hielo
  Piedra Lunar #C8BAA8   gris cálido
  Porcelana    #F5F2EC   blanco cálido (fondo)
  Spearmint    #3EBF85   verde vibrante (seleccionado)
  Coral        #F5856A   salmón (badge)
  Avellana     #B39C80   marrón cálido
  Sage         #8DAF9A   verde salvia
*/

interface ResolvedResult { name: string; httpsUrl: string; }

interface OrderState {
  id: string;
  order: Order | null;
  results: ResolvedResult[];
  resolving: boolean;
  resolveError: boolean;
  dlLoading: Record<string, boolean>;
}

type Phase = "select" | "ready" | "uploading" | "processing" | "done" | "error" | "nobg";

// Estilo especial cliente-side (quitar fondo). No es un prompt de Firestore:
// se procesa en el navegador, gratis, sin Storage ni Gemini ni créditos.
const NO_BG = "FOTO SIN FONDO";

function styleImage(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/styles/${slug}.webp`;
}

// ── Tarjeta de procesado con mensajes animados en tiempo real ────────────────
function ProcessingCard({
  os, preview, index,
}: {
  os: OrderState;
  preview: string;
  index: number;
}) {
  const isProcessing = os.order?.status === "processing";
  const msg = useProcessingMessage(isProcessing);

  const statusText =
    !os.order || os.order.status === "pending" ? "En cola..." :
      os.order.status === "processing" ? msg :
        os.order.status === "done" ? "✓ Listo" : "✗ Error";

  const statusColor =
    os.order?.status === "done" ? "#3EBF85" :
      os.order?.status === "error" ? "#F5856A" : "#B39C80";

  const pending = !os.order || os.order.status === "pending" || os.order.status === "processing";

  return (
    <div className="rounded-2xl border p-4 flex items-center gap-3"
      style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0"
        style={{ backgroundColor: "#C8BAA8" }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: "#2D2B2D" }}>
          Imagen {index + 1}
        </p>
        <p className="text-xs mt-0.5 truncate transition-all duration-500"
          style={{ color: statusColor }}>
          {statusText}
        </p>
      </div>
      {pending && (
        <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "#A8C4D4" }} />
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { user, isAdmin, credits } = useAuth();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("select");
  const [progresses, setProgresses] = useState<number[]>([]);
  const [orderStates, setOrderStates] = useState<OrderState[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    getActivePrompts().then(setPrompts).catch(console.error);
  }, []);

  // Escuchar todos los pedidos activos
  useEffect(() => {
    if (!orderStates.length) return;
    const unsubs = orderStates.map((os, idx) =>
      onSnapshot(doc(db, "orders", os.id), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const o: Order = {
          id: snap.id, userId: d.userId, userEmail: d.userEmail ?? "",
          status: d.status,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
          error: d.error ?? null, results: d.results ?? {},
        };
        setOrderStates(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], order: o };
          return next;
        });
        if (o.status === "done" || o.status === "error") {
          checkAllDone();
        }
      })
    );
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStates.map(s => s.id).join(",")]);

  function checkAllDone() {
    setOrderStates(prev => {
      const allSettled = prev.every(s => s.order && (s.order.status === "done" || s.order.status === "error"));
      if (allSettled) setPhase("done");
      return prev;
    });
  }

  // Resolver URLs cuando un pedido esté listo
  useEffect(() => {
    orderStates.forEach((os, idx) => {
      if (!os.order || os.order.status !== "done" || os.results.length > 0 || os.resolving || os.resolveError) return;
      const entries = Object.entries(os.order.results).filter(([, v]) => v !== "error");
      if (!entries.length) return;
      setOrderStates(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], resolving: true };
        return next;
      });
      Promise.all(entries.map(async ([name, gsPath]) => ({
        name, httpsUrl: await resolveGsUrl(gsPath),
      }))).then(results => {
        setOrderStates(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], results, resolving: false };
          return next;
        });
      }).catch(err => {
        console.error("Error resolving URLs:", err);
        setOrderStates(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], resolving: false, resolveError: true };
          return next;
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStates.map(s => s.order?.status).join(",")]);

  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(f =>
      f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    if (!valid.length) { setErrorMsg("Solo imágenes de máximo 10 MB."); return; }
    setErrorMsg("");
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    setPhase("ready");
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    const newFiles = files.filter((_, j) => j !== i);
    const newPreviews = previews.filter((_, j) => j !== i);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (newFiles.length === 0) setPhase("select");
  }

  function handleClear() {
    previews.forEach(URL.revokeObjectURL);
    setFiles([]); setPreviews([]); setPhase("select");
    setProgresses([]); setOrderStates([]);
    setErrorMsg(""); setSelected([]);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function handleGenerate() {
    if (!files.length || !user || !selected.length) return;

    // ── Modo "quitar fondo": 100% en el navegador, sin subir nada ──
    if (isNoBgMode) {
      setErrorMsg("");
      setPhase("nobg");
      return;
    }

    // ── Modo IA: subir a Storage → Gemini ──
    setPhase("uploading");
    setErrorMsg("");
    setProgresses(files.map(() => 0));

    try {
      const selectedPrompts = prompts.filter((p) => aiSelected.includes(p.name));
      const created: OrderState[] = await Promise.all(
        files.map(async (file, i) => {
          const id = await createOrder(user.uid, user.email ?? "", selectedPrompts);
          await uploadOriginal(user.uid, id, file, (pct) => {
            setProgresses(prev => {
              const next = [...prev];
              next[i] = pct;
              return next;
            });
          });
          return { id, order: null, results: [], resolving: false, resolveError: false, dlLoading: {} };
        })
      );
      setOrderStates(created);
      setPhase("processing");
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al subir las fotos. Intenta de nuevo.");
      setPhase("ready");
      setProgresses([]);
    }
  }

  async function handleDownload(osIdx: number, url: string, name: string) {
    setOrderStates(prev => {
      const next = [...prev];
      next[osIdx] = { ...next[osIdx], dlLoading: { ...next[osIdx].dlLoading, [name]: true } };
      return next;
    });
    try { await dlImg(url, `disenador_${name.toLowerCase().replace(/\s+/g, "_")}.png`); }
    catch { window.open(url, "_blank", "noopener"); }
    finally {
      setOrderStates(prev => {
        const next = [...prev];
        next[osIdx] = { ...next[osIdx], dlLoading: { ...next[osIdx].dlLoading, [name]: false } };
        return next;
      });
    }
  }

  async function handleSignOut() {
    await signOut(auth); router.replace("/login");
  }

  // ─── Modo "quitar fondo" (API pro) vs estilos de IA ──────────────────────
  const isNoBgMode = selected.includes(NO_BG);
  const aiSelected = selected.filter((n) => n !== NO_BG);

  // ─── Créditos — 1 por imagen, tanto IA como quitar fondo ──────────────────
  const totalCost = isNoBgMode
    ? files.length                       // 1 crédito por foto en modo quitar fondo
    : files.length * aiSelected.length;  // 1 por imagen de IA generada
  const noCredits = !isAdmin && credits !== null && credits <= 0;
  const insufficient = !isAdmin && credits !== null && totalCost > credits;

  const canGenerate =
    phase === "ready" && selected.length > 0 && files.length > 0 && !insufficient;
  const allDone = orderStates.length > 0 && orderStates.every(s => s.order && (s.order.status === "done" || s.order.status === "error"));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F2EC" }}>

      {/* Header Obsidiana */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#2D2B2D" }}>
        <a href="/upload" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Logo_circulo.webp" alt="Moonkey IA" className="w-7 h-7 rounded-full object-cover" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-white tracking-wide">Moonkey IA</span>
            <span className="text-[9px] uppercase tracking-[.2em]" style={{ color: "#A8C4D4" }}>Studio</span>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <CreditBadge onClick={isAdmin ? undefined : () => setShowUpgrade(true)} />
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

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />


      {/* Layout: 1 columna en móvil, 2 columnas en pantalla grande */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="lg:grid lg:grid-cols-[400px_1fr] lg:gap-10 lg:items-start">

          {/* ── COLUMNA IZQUIERDA: controles ── */}
          <div className="space-y-5">

            {/* ── SUBIR IMAGEN(ES) ── */}
            <section>
              {/* Input siempre en el DOM para que inputRef.current nunca sea null */}
              <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only"
                onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />

              <p className="text-xs font-bold uppercase tracking-[.18em] mb-2.5"
                style={{ color: "#2D2B2D" }}>
                {files.length > 1 ? `${files.length} imágenes seleccionadas` : "Subir imagen"}
              </p>

              {/* Aviso de créditos agotados */}
              {noCredits && (phase === "select" || phase === "ready") && (
                <div className="flex items-start gap-2.5 p-3 mb-3 rounded-xl"
                  style={{ backgroundColor: "#FDF1EE", border: "1px solid #F5856A33" }}>
                  <Zap size={15} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>
                      Te quedaste sin créditos
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#B39C80" }}>
                      Cada imagen (IA o quitar fondo) usa 1 crédito.{" "}
                      <button onClick={() => setShowUpgrade(true)}
                        className="font-semibold underline" style={{ color: "#2E9E6C" }}>
                        Actualiza tu plan
                      </button>.
                    </p>
                  </div>
                </div>
              )}

              {phase === "select" ? (
                /* Sin imágenes: botones cámara / galería */
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                    style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
                    <Camera size={22} style={{ color: "#A8C4D4" }} />
                    <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Cámara</span>
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only"
                      onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />
                  </label>
                  <label onClick={() => inputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border cursor-pointer transition min-h-[110px]"
                    style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
                    <ImagePlus size={22} style={{ color: "#A8C4D4" }} />
                    <span className="text-sm font-medium" style={{ color: "#2D2B2D" }}>Galería</span>
                  </label>
                </div>
              ) : (
                /* Con imágenes: fila de thumbnails */
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {previews.map((url, i) => (
                    <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden"
                      style={{ backgroundColor: "#C8BAA8" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                      {phase === "uploading" && (
                        <div className="absolute inset-0 bg-black/40 flex items-end">
                          <div className="w-full h-1 bg-white/30">
                            <div className="h-full transition-all" style={{
                              width: `${progresses[i] ?? 0}%`,
                              backgroundColor: "#A8C4D4",
                            }} />
                          </div>
                        </div>
                      )}
                      {(phase === "ready") && (
                        <button onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#2D2B2D" }}>
                          <X size={10} className="text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Botón agregar más — button en vez de label para evitar bugs de browser */}
                  {phase === "ready" && (
                    <button
                      type="button"
                      className="shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition border-2 border-dashed active:scale-95"
                      style={{ borderColor: "#3EBF85", backgroundColor: "#E8F8F1" }}
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = ""; // reset para permitir reselección
                          inputRef.current.click();
                        }
                      }}>
                      <Plus size={18} style={{ color: "#3EBF85" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "#3EBF85" }}>Agregar</span>
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── ESTILOS — selección múltiple ── */}
            {(phase === "ready" || phase === "uploading") && (
              <section>
                <p className="text-xs font-bold uppercase tracking-[.18em] mb-2.5"
                  style={{ color: "#2D2B2D" }}>
                  {selected.length === 0
                    ? "Elegir estilos"
                    : isNoBgMode
                    ? "Foto sin fondo seleccionado"
                    : `${selected.length} estilo${selected.length > 1 ? "s" : ""} seleccionado${selected.length > 1 ? "s" : ""}`}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {prompts.map((p) => {
                    const isSelected = selected.includes(p.name);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelected(prev => {
                          const base = prev.filter(n => n !== NO_BG); // salir de "quitar fondo"
                          return base.includes(p.name)
                            ? base.filter(n => n !== p.name)          // deseleccionar
                            : [...base, p.name];                       // seleccionar
                        })}
                        className="flex flex-col rounded-2xl overflow-hidden transition-all active:scale-[0.97] relative"
                        style={{
                          backgroundColor: "white",
                          border: isSelected ? "2.5px solid #3EBF85" : "1.5px solid #C8BAA8",
                          boxShadow: isSelected ? "0 0 0 3px #3EBF8520" : "none",
                        }}>
                        <div className="w-full aspect-square overflow-hidden"
                          style={{ backgroundColor: "#E8DDD0" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={styleImage(p.name)} alt={p.name}
                            className="w-full h-full object-cover"
                            onError={e => {
                              const img = e.target as HTMLImageElement;
                              img.onerror = null;            // evitar loop si logo.webp tampoco carga
                              img.src = "/logo/logo.webp";
                            }} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-center py-2 px-1 leading-tight"
                          style={{ color: isSelected ? "#3EBF85" : "#2D2B2D" }}>
                          {p.name}
                        </p>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#3EBF85" }}>
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* ── Tarjeta especial: FOTO SIN FONDO (cliente, gratis) ── */}
                <button
                  onClick={() => setSelected(prev => prev.includes(NO_BG) ? [] : [NO_BG])}
                  className="w-full mt-2 flex items-center gap-3 rounded-2xl p-3 transition-all active:scale-[0.99] relative text-left"
                  style={{
                    backgroundColor: "white",
                    border: isNoBgMode ? "2.5px solid #2D2B2D" : "1.5px solid #C8BAA8",
                    boxShadow: isNoBgMode ? "0 0 0 3px #2D2B2D18" : "none",
                  }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "#fff",
                      backgroundImage:
                        "linear-gradient(45deg,#dcdcdc 25%,transparent 25%),linear-gradient(-45deg,#dcdcdc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dcdcdc 75%),linear-gradient(-45deg,transparent 75%,#dcdcdc 75%)",
                      backgroundSize: "10px 10px",
                      backgroundPosition: "0 0,0 5px,5px -5px,-5px 0",
                      border: "1px solid #E0D6C8",
                    }}>
                    <Scissors size={20} style={{ color: "#2D2B2D" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold uppercase tracking-wide"
                        style={{ color: "#2D2B2D" }}>
                        Foto sin fondo
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#EBF5F9", color: "#2E6F8F" }}>
                        Calidad pro
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#B39C80" }}>
                      Recorta el producto con fondo transparente (PNG). 1 crédito por imagen.
                    </p>
                  </div>
                  {isNoBgMode && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#2D2B2D" }}>
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {selected.length === 0 && (
                  <p className="text-xs mt-2 text-center" style={{ color: "#B39C80" }}>
                    Selecciona un estilo de IA o &ldquo;Foto sin fondo&rdquo; para continuar
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

            {/* ── GENERAR / QUITAR FONDO ── */}
            {phase === "ready" && insufficient ? (
              <div className="space-y-2">
                <button onClick={() => setShowUpgrade(true)}
                  className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#3EBF85" }}>
                  <Zap size={16} fill="currentColor" /> ACTUALIZAR PLAN
                </button>
                <p className="text-center text-xs" style={{ color: "#C45A42" }}>
                  Necesitas {totalCost} crédito{totalCost > 1 ? "s" : ""} y tienes {credits ?? 0}.
                </p>
              </div>
            ) : phase === "ready" && isNoBgMode ? (
              <div className="space-y-2">
                <button onClick={handleGenerate} disabled={!canGenerate}
                  className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: canGenerate ? "#2D2B2D" : "#C8BAA8", cursor: canGenerate ? "pointer" : "not-allowed" }}>
                  <Scissors size={16} />
                  {files.length > 1 ? `QUITAR FONDO (${files.length})` : "QUITAR FONDO"}
                </button>
                {!isAdmin && (
                  <p className="text-center text-[11px]" style={{ color: "#B39C80" }}>
                    Cuesta {totalCost} crédito{totalCost > 1 ? "s" : ""}
                    {credits !== null && ` · te quedan ${credits}`}
                  </p>
                )}
              </div>
            ) : phase === "ready" ? (
              <div className="space-y-2">
                <button onClick={handleGenerate} disabled={!canGenerate}
                  className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white"
                  style={{ backgroundColor: canGenerate ? "#2D2B2D" : "#C8BAA8", cursor: canGenerate ? "pointer" : "not-allowed" }}>
                  {files.length > 1 || selected.length > 1
                    ? `GENERAR ${totalCost} IMAGEN${totalCost > 1 ? "ES" : ""}`
                    : "GENERAR IMAGEN"}
                </button>
                {totalCost > 0 && !isAdmin && (
                  <p className="text-center text-[11px]" style={{ color: "#B39C80" }}>
                    Cuesta {totalCost} crédito{totalCost > 1 ? "s" : ""}
                    {credits !== null && ` · te quedan ${credits}`}
                  </p>
                )}
              </div>
            ) : null}

            {/* Subiendo */}
            {phase === "uploading" && (
              <div className="w-full h-14 rounded-full flex items-center justify-center gap-2.5 text-white"
                style={{ backgroundColor: "#2D2B2D" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="font-bold text-sm tracking-[.12em]">
                  SUBIENDO {files.length > 1 ? `(${files.length})` : ""}...
                </span>
              </div>
            )}

            {/* Procesando */}
            {phase === "processing" && (
              <div className="space-y-2">
                {orderStates.map((os, i) => (
                  <ProcessingCard key={os.id} os={os} preview={previews[i]} index={i} />
                ))}
              </div>
            )}


            {(phase === "select" || phase === "ready") && (
              <p className="text-center text-xs pt-1">
                <a href="/orders" className="hover:opacity-70 transition" style={{ color: "#8DAF9A" }}>
                  Ver pedidos anteriores →
                </a>
              </p>
            )}

          </div>{/* fin columna izquierda */}

          {/* ── COLUMNA DERECHA: resultados ── */}
          <div className="mt-5 lg:mt-0">

            {/* Resultados — quitar fondo (cliente, gratis) */}
            {phase === "nobg" && (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {files.map((file, i) => (
                    <BackgroundRemoval key={`nobg-${i}`} file={file} index={i} />
                  ))}
                </div>
                <button onClick={handleClear}
                  className="w-full text-sm py-4 text-center transition hover:opacity-70 mt-2"
                  style={{ color: "#2D2B2D" }}>
                  ← Nueva foto
                </button>
              </section>
            )}

            {/* Resultados — IA */}
            {(phase === "done" || (phase === "processing" && allDone)) && (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {orderStates.map((os, i) =>
                    os.resolving ? (
                      <div key={os.id} className="rounded-2xl" style={{ backgroundColor: "white" }}>
                        <LogoLoader text="Preparando tu imagen..." />
                      </div>
                    ) : os.order?.status === "error" ? (
                      <div key={os.id} className="flex items-start gap-2 p-3 rounded-xl"
                        style={{ backgroundColor: "#FEF0ED" }}>
                        <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
                        <p className="text-sm" style={{ color: "#C45A42" }}>
                          {os.order.error ?? "Error al generar."}
                        </p>
                      </div>
                    ) : os.results.length > 0 ? (
                      os.results.map(r => (
                        <div key={`${os.id}-${r.name}`} className="space-y-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previews[i]} alt="" className="w-7 h-7 rounded-lg object-cover"
                              style={{ backgroundColor: "#C8BAA8" }} />
                            <span className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>{r.name}</span>
                          </div>
                          <ImageWithLoader src={r.httpsUrl} alt={r.name} />
                          <button
                            onClick={() => handleDownload(i, r.httpsUrl, r.name)}
                            disabled={os.dlLoading[r.name]}
                            className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                            style={{ backgroundColor: "#A8C4D4", color: "#2D2B2D" }}>
                            {os.dlLoading[r.name] ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                            DESCARGAR IMAGEN
                          </button>
                        </div>
                      ))
                    ) : (
                      <div key={os.id} className="rounded-2xl" style={{ backgroundColor: "white" }}>
                        <LogoLoader text="Preparando tu imagen..." />
                      </div>
                    )
                  )}
                </div>

                <button onClick={handleClear}
                  className="w-full text-sm py-4 text-center transition hover:opacity-70 mt-2"
                  style={{ color: "#2D2B2D" }}>
                  ← Nueva foto
                </button>
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

          </div>{/* fin columna derecha */}

        </div>

        {/* ── FOOTER: tips + sugerencia ── */}
        <footer className="mt-12 max-w-3xl mx-auto">
          {/* Separador */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px" style={{ backgroundColor: "#D8CDBD" }} />
            <span className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "#B39C80" }}>
              Consejos
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#D8CDBD" }} />
          </div>

          {/* Tips típicos */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="flex flex-col items-center text-center gap-2 px-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EBF5F9" }}>
                <Sparkles size={18} style={{ color: "#A8C4D4" }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>Buena iluminación</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#B39C80" }}>
                Toma la foto con luz natural y un fondo simple para mejores resultados.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 px-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E8F8F1" }}>
                <Check size={18} style={{ color: "#3EBF85" }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>Un producto por foto</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#B39C80" }}>
                Sube una imagen nítida y centrada del producto que quieres transformar.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2 px-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FDF1EE" }}>
                <ShieldCheck size={18} style={{ color: "#F5856A" }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>Tus fotos son privadas</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#B39C80" }}>
                Solo tú puedes ver y descargar las imágenes que generas. Nadie más.
              </p>
            </div>
          </div>

          {/* Separador del botón de sugerencia */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: "#D8CDBD" }} />
            <Lightbulb size={14} style={{ color: "#B39C80" }} />
            <div className="flex-1 h-px" style={{ backgroundColor: "#D8CDBD" }} />
          </div>

          {/* Bloque sugerencia */}
          <div className="text-center space-y-3 pb-4">
            <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
              ¿Tienes una idea o encontraste un problema?
            </p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: "#B39C80" }}>
              Tu opinión nos ayuda a mejorar. Escríbenos tu sugerencia y la tendremos en cuenta para las próximas versiones.
            </p>
            <a
              href="https://wa.me/34600854768?text=Hola%2C%20tengo%20una%20sugerencia%20para%20Moonkey%20Studio%20IA%3A%20"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full font-bold text-sm transition active:scale-[0.98] mt-1"
              style={{ backgroundColor: "#3EBF85", color: "white" }}
            >
              <MessageCircle size={16} />
              ENVIAR SUGERENCIA
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
