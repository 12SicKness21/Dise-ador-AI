"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import {
  getPrompts,
  deletePrompt,
  updatePrompt,
  createPrompt,
  INITIAL_PROMPTS,
  type Prompt,
} from "@/lib/prompts";
import { useAuth } from "@/components/AuthProvider";

export default function PromptsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPrompts(await getPrompts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deletePrompt(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(p: Prompt) {
    setTogglingId(p.id);
    try {
      await updatePrompt(p.id, { active: !p.active });
      setPrompts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x))
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSeed() {
    if (!user?.email) return;
    setSeeding(true);
    try {
      for (const p of INITIAL_PROMPTS) {
        await createPrompt(p, user.email);
      }
      await load();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} configurado{prompts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/prompts/new"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
        >
          <Plus size={15} />
          Nuevo
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-xl py-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-500">No hay prompts todavía.</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-50"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Cargar los 3 prompts iniciales
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {prompts.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm leading-snug">{p.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      p.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1">{p.description}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(p)}
                  disabled={togglingId === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-40"
                  aria-label={p.active ? "Desactivar" : "Activar"}
                >
                  {togglingId === p.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : p.active ? (
                    <ToggleRight size={18} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={18} />
                  )}
                </button>

                <button
                  onClick={() => router.push(`/admin/prompts/${p.id}`)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>

                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={deletingId === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                  aria-label="Eliminar"
                >
                  {deletingId === p.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
