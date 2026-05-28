"use client";

import { useSearchParams } from "next/navigation";
import { Loader2, Clock } from "lucide-react";
import { Suspense } from "react";

function OrdersContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-sm mx-auto">
      <header className="mb-10">
        <a href="/upload" className="text-sm text-zinc-400 hover:text-zinc-700 transition">
          ← Volver
        </a>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
          <Clock size={28} className="text-zinc-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Procesando</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xs">
            Tu foto está siendo generada. Esto puede tardar unos segundos.
          </p>
          {orderId && (
            <p className="text-xs text-zinc-300 mt-3 font-mono">
              #{orderId.slice(0, 8)}
            </p>
          )}
        </div>
        <Loader2 size={20} className="animate-spin text-zinc-400" />
        <p className="text-xs text-zinc-400">
          Panel de resultados disponible en Fase 5
        </p>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersContent />
    </Suspense>
  );
}
