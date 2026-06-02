"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updatePrompt, type Prompt, type PromptInput } from "@/lib/prompts";
import { PromptForm } from "@/components/admin/PromptForm";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditPromptPage() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "prompts", id));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setPrompt({ id: snap.id, ...(snap.data() as Omit<Prompt, "id">) });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSubmit(data: PromptInput) {
    await updatePrompt(id, data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (notFound || !prompt) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">Prompt no encontrado.</p>
        <a href="/admin/prompts" className="text-sm text-zinc-900 underline mt-2 inline-block">
          Volver
        </a>
      </div>
    );
  }

  return (
    <div>
      <a
        href="/admin/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-8"
      >
        <ArrowLeft size={14} />
        Volver
      </a>
      <h1 className="text-xl font-semibold tracking-tight mb-8">Editar prompt</h1>
      <PromptForm
        initialValues={{
          name:            prompt.name,
          description:     prompt.description,
          prompt_text:     prompt.prompt_text,
          active:          prompt.active,
          exampleImageUrl: prompt.exampleImageUrl,
        }}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
