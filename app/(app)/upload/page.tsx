"use client";

import { useRef, useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, Timestamp } from "firebase/firestore";
import {
  Camera, ImagePlus, Download, X, Loader2,
  Shield, LogOut, AlertCircle, Check, Plus,
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

type Phase = "select" | "ready" | "uploading" | "processing" | "done" | "error";

function styleImage(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/styles/${slug}.webp`;
}

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [files, setFiles]     = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [phase, setPhase]         = useState<Phase>("select");
  const [progresses, setProgresses] = useState<number[]>([]);
  const [orderStates, setOrderStates] = useState<OrderState[]>([]);
  const [errorMsg, setErrorMsg]   = useState("");

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
          id: snap.id, uid: d.uid, status: d.status,
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
    setErrorMsg(""); setSelected(null);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function handleGenerate() {
    if (!files.length || !user || !selected) return;
    setPhase("uploading");
    setErrorMsg("");
    setProgresses(files.map(() => 0));

    try {
      const created: OrderState[] = await Promise.all(
        files.map(async (file, i) => {
          const id = await createOrder(user.uid, selected);
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

  const canGenerate = phase === "ready" && selected !== null && files.length > 0;
  const allDone = orderStates.length > 0 && orderStates.every(s => s.order && (s.order.status === "done" || s.order.status === "error"));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F2EC" }}>

      {/* Header Obsidiana */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#2D2B2D" }}>
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/Logo_circulo.webp" alt="Moonkey IA" className="w-7 h-7 rounded-full object-cover" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-white tracking-wide">Moonkey IA</span>
            <span className="text-[9px] uppercase tracking-[.2em]" style={{ color: "#A8C4D4" }}>Studio</span>
          </div>
        </div>
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

        {/* ── SUBIR IMAGEN(ES) ── */}
        <section>
          {/* Input siempre en el DOM para que inputRef.current nunca sea null */}
          <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only"
            onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }} />

          <p className="text-xs font-bold uppercase tracking-[.18em] mb-2.5"
            style={{ color: "#2D2B2D" }}>
            {files.length > 1 ? `${files.length} imágenes seleccionadas` : "Subir imagen"}
          </p>

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
                  <button key={p.id} onClick={() => setSelected(p.name)}
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
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

        {/* ── GENERAR IMAGEN ── */}
        {phase === "ready" && (
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="w-full h-14 rounded-full font-bold text-sm tracking-[.12em] transition active:scale-[0.98] text-white"
            style={{ backgroundColor: canGenerate ? "#2D2B2D" : "#C8BAA8", cursor: canGenerate ? "pointer" : "not-allowed" }}>
            {files.length > 1 ? `GENERAR ${files.length} IMÁGENES` : "GENERAR IMAGEN"}
          </button>
        )}

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
              <div key={os.id} className="rounded-2xl border p-4 flex items-center gap-3"
                style={{ backgroundColor: "white", borderColor: "#C8BAA8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0"
                  style={{ backgroundColor: "#C8BAA8" }} />
                <div className="flex-1">
                  <p className="text-xs font-medium" style={{ color: "#2D2B2D" }}>
                    Imagen {i + 1}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#B39C80" }}>
                    {!os.order || os.order.status === "pending" ? "En cola..." :
                     os.order.status === "processing" ? "Procesando..." :
                     os.order.status === "done" ? "✓ Listo" : "✗ Error"}
                  </p>
                </div>
                {(!os.order || os.order.status === "pending" || os.order.status === "processing") && (
                  <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "#A8C4D4" }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Resultados */}
        {(phase === "done" || (phase === "processing" && allDone)) && (
          <section className="space-y-6">
            {orderStates.map((os, i) => (
              <div key={os.id}>
                {/* Mini header por imagen */}
                <div className="flex items-center gap-2 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previews[i]} alt="" className="w-8 h-8 rounded-lg object-cover"
                    style={{ backgroundColor: "#C8BAA8" }} />
                  <span className="text-xs font-semibold" style={{ color: "#2D2B2D" }}>
                    Imagen {i + 1}
                  </span>
                </div>

                {os.resolving ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={18} className="animate-spin" style={{ color: "#A8C4D4" }} />
                  </div>
                ) : os.order?.status === "error" ? (
                  <div className="flex items-start gap-2 p-3 rounded-xl"
                    style={{ backgroundColor: "#FEF0ED" }}>
                    <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
                    <p className="text-sm" style={{ color: "#C45A42" }}>
                      {os.order.error ?? "Error al generar."}
                    </p>
                  </div>
                ) : os.results.length > 0 ? (
                  os.results.map(r => (
                    <div key={r.name} className="space-y-2.5">
                      <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: "#C8BAA8" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.httpsUrl} alt={r.name}
                          className="w-full aspect-square object-cover" loading="lazy" />
                        {/* Badge "Generado por IA" desactivado por solicitud
                        <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: "#F5856A" }}>
                          Generado por IA
                        </span> */}
                      </div>
                      <button
                        onClick={() => handleDownload(i, r.httpsUrl, r.name)}
                        disabled={os.dlLoading[r.name]}
                        className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: "#A8C4D4", color: "#2D2B2D" }}>
                        {os.dlLoading[r.name] ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        DESCARGAR IMAGEN
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin" style={{ color: "#A8C4D4" }} />
                  </div>
                )}
              </div>
            ))}

            <button onClick={handleClear}
              className="w-full text-sm py-1 text-center transition hover:opacity-70"
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
