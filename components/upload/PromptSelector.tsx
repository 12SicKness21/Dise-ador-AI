"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { getActivePrompts, type Prompt } from "@/lib/prompts";

export function PromptSelector() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivePrompts()
      .then(setPrompts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 size={14} className="animate-spin" />
        Cargando estilos...
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        No hay estilos activos. El admin debe activar al menos uno.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Se generarán {prompts.length} variacion{prompts.length !== 1 ? "es" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-xs font-medium text-zinc-700"
          >
            <Sparkles size={11} className="text-zinc-400" />
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
