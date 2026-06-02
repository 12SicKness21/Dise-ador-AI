"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { uploadOriginal } from "@/lib/storage";
import { createOrder } from "@/lib/orders";
import { useAuth } from "@/components/AuthProvider";

export function CameraUpload() {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) {
      setError("Solo se aceptan imágenes.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 10 MB.");
      return;
    }
    setError("");
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleClear() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setProgress(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    setError("");
    try {
      const orderId = await createOrder(user.uid, user.email ?? "", []);
      await uploadOriginal(user.uid, orderId, file, setProgress);
      router.push(`/orders?orderId=${orderId}`);
    } catch (e) {
      console.error(e);
      setError("Error al subir la foto. Intentá de nuevo.");
      setUploading(false);
      setProgress(0);
    }
  }

  // Sin preview: mostrar opciones de captura
  if (!preview) {
    return (
      <div className="space-y-3">
        {/* Input oculto para galería */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Seleccionar imagen"
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Cámara — capture=environment abre cámara trasera en mobile */}
          <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition min-h-[140px]">
            <Camera size={28} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600">Cámara</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="sr-only"
              aria-label="Abrir cámara"
            />
          </label>

          {/* Galería */}
          <label
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition min-h-[140px]"
          >
            <ImagePlus size={28} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600">Galería</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Con preview: mostrar imagen + botón generar
  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-zinc-100 aspect-square w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Vista previa de la zapatilla"
          className="w-full h-full object-cover"
        />
        {!uploading && (
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
            aria-label="Quitar foto"
          >
            <X size={16} />
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="text-white animate-spin" />
            <div className="w-32 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-sm font-medium">Subiendo...</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-medium text-base hover:bg-zinc-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Generando..." : "Generar fotos"}
      </button>
    </div>
  );
}
