"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { resolveGsUrl } from "@/lib/download";
import { DownloadButton } from "./DownloadButton";
import type { Order } from "@/lib/orders";

interface ResolvedResult {
  name: string;
  httpsUrl: string;
}

interface Props {
  order: Order;
  highlight?: boolean;
}

export function OrderCard({ order, highlight }: Props) {
  const [resolved, setResolved] = useState<ResolvedResult[]>([]);
  const [resolving, setResolving] = useState(false);

  // Cuando el order llega a "done", resolvemos las URLs gs:// → https://
  useEffect(() => {
    if (order.status !== "done") return;
    const entries = Object.entries(order.results).filter(([, v]) => v !== "error");
    if (entries.length === 0) return;

    setResolving(true);
    Promise.all(
      entries.map(async ([name, gsPath]) => ({
        name,
        httpsUrl: await resolveGsUrl(gsPath),
      }))
    )
      .then(setResolved)
      .catch(console.error)
      .finally(() => setResolving(false));
  }, [order.status, order.results]);

  const date = order.createdAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(order.createdAt)
    : "";

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        highlight ? "border-zinc-400 shadow-sm" : "border-zinc-100"
      }`}
    >
      {/* Header del card */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-400 font-mono">#{order.id.slice(0, 8)}</span>
        <div className="flex items-center gap-2">
          {date && <span className="text-xs text-zinc-400">{date}</span>}
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Estado: procesando */}
      {(order.status === "pending" || order.status === "processing") && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={22} className="animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">
            {order.status === "pending" ? "En cola..." : "Generando imágenes con IA..."}
          </p>
        </div>
      )}

      {/* Estado: error total */}
      {order.status === "error" && (
        <div className="flex items-start gap-2 py-4 text-red-500">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p className="text-sm">{order.error ?? "Error al generar las imágenes."}</p>
        </div>
      )}

      {/* Estado: done — imágenes */}
      {order.status === "done" && (
        <>
          {resolving ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-zinc-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {resolved.map((r) => (
                <div key={r.name}>
                  <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                    {r.name}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.httpsUrl}
                    alt={r.name}
                    className="w-full rounded-xl object-cover aspect-square bg-zinc-50"
                    loading="lazy"
                  />
                  <div className="mt-2">
                    <DownloadButton
                      url={r.httpsUrl}
                      filename={`zapatilla_${r.name.toLowerCase().replace(/\s+/g, "_")}.png`}
                      label={`Descargar — ${r.name}`}
                    />
                  </div>
                </div>
              ))}

              {/* Errores parciales */}
              {Object.entries(order.results)
                .filter(([, v]) => v === "error")
                .map(([name]) => (
                  <div key={name} className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle size={13} />
                    {name}: no se pudo generar.
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    pending:    "bg-zinc-100 text-zinc-500",
    processing: "bg-blue-50 text-blue-600",
    done:       "bg-emerald-50 text-emerald-700",
    error:      "bg-red-50 text-red-600",
  } as const;
  const label = {
    pending: "En cola",
    processing: "Procesando",
    done: "Listo",
    error: "Error",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}
