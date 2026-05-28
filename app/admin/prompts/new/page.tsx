"use client";

import { useAuth } from "@/components/AuthProvider";
import { PromptForm } from "@/components/admin/PromptForm";
import { createPrompt, type PromptInput } from "@/lib/prompts";
import { ArrowLeft } from "lucide-react";

export default function NewPromptPage() {
  const { user } = useAuth();

  async function handleSubmit(data: PromptInput) {
    if (!user?.email) throw new Error("No autenticado");
    await createPrompt(data, user.email);
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
      <h1 className="text-xl font-semibold tracking-tight mb-8">Nuevo prompt</h1>
      <PromptForm onSubmit={handleSubmit} submitLabel="Crear prompt" />
    </div>
  );
}
