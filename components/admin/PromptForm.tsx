"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { PromptInput } from "@/lib/prompts";
import { uploadPromptExample } from "@/lib/storage";

interface Props {
  initialValues?: PromptInput;
  onSubmit: (data: PromptInput) => Promise<void>;
  submitLabel: string;
}

const EMPTY: PromptInput = {
  name: "",
  description: "",
  prompt_text: "",
  active: true,
  exampleImageUrl: undefined,
};

export function PromptForm({ initialValues = EMPTY, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PromptInput>(initialValues);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  function set(field: keyof PromptInput, value: string | boolean | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadPromptExample(file);
      set("exampleImageUrl", url);
    } catch {
      setError("Error al subir la imagen. Intentá de nuevo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.prompt_text.trim()) {
      setError("Nombre y texto del prompt son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit({ ...form, name: form.name.trim().toUpperCase() });
      router.push("/admin/prompts");
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Nombre</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="MODELO DE PIE"
          className="w-full h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 uppercase"
        />
        <p className="text-xs text-zinc-400">Se muestra como botón en la pantalla de subida.</p>
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Breve descripción del efecto"
          className="w-full h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
      </div>

      {/* Texto del prompt */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Texto del prompt</label>
        <textarea
          required
          value={form.prompt_text}
          onChange={(e) => set("prompt_text", e.target.value)}
          placeholder="Instrucción completa para Gemini Image..."
          rows={6}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 resize-none leading-relaxed"
        />
        <p className="text-xs text-zinc-400">{form.prompt_text.length} caracteres</p>
      </div>

      {/* Imagen de ejemplo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Imagen de ejemplo</label>
        <p className="text-xs text-zinc-400">
          Se muestra como miniatura en el selector de estilos. Recomendado: foto cuadrada del resultado esperado.
        </p>

        {form.exampleImageUrl ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.exampleImageUrl} alt="Ejemplo" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => set("exampleImageUrl", undefined)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-900/70 flex items-center justify-center"
              aria-label="Quitar imagen"
            >
              <X size={12} className="text-white" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 w-fit cursor-pointer h-10 px-4 rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition">
            {uploading
              ? <><Loader2 size={15} className="animate-spin" /> Subiendo...</>
              : <><ImagePlus size={15} /> Subir foto de ejemplo</>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Toggle activo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.active}
          onClick={() => set("active", !form.active)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            form.active ? "bg-zinc-900" : "bg-zinc-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              form.active ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm text-zinc-600">
          {form.active ? "Activo — visible para clientes" : "Inactivo — oculto para clientes"}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex items-center gap-2 h-11 px-5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/prompts")}
          className="h-11 px-5 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
