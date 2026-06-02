"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";
import {
  Loader2, Plus, Download, AlertCircle,
  List, LayoutGrid, ChevronDown, ChevronUp,
} from "lucide-react";

interface ResolvedResult { name: string; httpsUrl: string; }

interface CardProps {
  order: Order & { promptName?: string };
  highlight: boolean;
  defaultExpanded: boolean;
}

function OrderCard({ order, highlight, defaultExpanded }: CardProps) {
  const [expanded, setExpanded]     = useState(defaultExpanded);
  const [resolved, setResolved]     = useState<ResolvedResult[]>([]);
  const [resolving, setResolving]   = useState(false);
  const [resolveErr, setResolveErr] = useState(false);
  const [dlLoading, setDlLoading]   = useState<Record<string, boolean>>({});

  useEffect(() => { setExpanded(defaultExpanded); }, [defaultExpanded]);

  useEffect(() => {
    if (!expanded || order.status !== "done" || resolved.length > 0 || resolving || resolveErr) return;
    const entries = Object.entries(order.results).filter(([, v]) => v !== "error");
    if (!entries.length) return;
    setResolving(true); setResolveErr(false);
    Promise.all(entries.map(async ([name, gsPath]) => ({
      name, httpsUrl: await resolveGsUrl(gsPath),
    })))
      .then(setResolved)
      .catch(err => { console.error(err); setResolveErr(true); })
      .finally(() => setResolving(false));
  }, [expanded, order.status, order.results, resolved.length, resolving]);

  async function handleDownload(url: string, name: string) {
    setDlLoading(p => ({ ...p, [name]: true }));
    try { await dlImg(url, `disenador_${name.toLowerCase().replace(/\s+/g, "_")}.png`); }
    catch { window.open(url, "_blank", "noopener"); }
    finally { setDlLoading(p => ({ ...p, [name]: false })); }
  }

  const date = order.createdAt
    ? new Intl.DateTimeFormat("es", {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      }).format(order.createdAt)
    : "";

  const STATUS_COLOR: Record<Order["status"], string> = {
    pending: "#C8BAA8", processing: "#A8C4D4", done: "#3EBF85", error: "#F5856A",
  };
  const STATUS_LABEL: Record<Order["status"], string> = {
    pending: "En cola", processing: "Procesando", done: "Listo", error: "Error",
  };

  return (
    <div className="rounded-2xl border overflow-hidden transition-all"
      style={{
        backgroundColor: "white",
        borderColor: highlight ? "#A8C4D4" : "#C8BAA8",
        boxShadow: highlight ? "0 0 0 3px #A8C4D430" : "none",
      }}>

      {/* ── Cabecera siempre visible ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: STATUS_COLOR[order.status] }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold" style={{ color: "#2D2B2D" }}>
              #{order.id.slice(0, 8)}
            </span>
            {order.promptName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                style={{ backgroundColor: "#E8DDD0", color: "#B39C80" }}>
                {order.promptName}
              </span>
            )}
          </div>
          {date && <p className="text-[11px] mt-0.5" style={{ color: "#B39C80" }}>{date}</p>}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${STATUS_COLOR[order.status]}22`, color: STATUS_COLOR[order.status] }}>
          {STATUS_LABEL[order.status]}
        </span>
        {order.status === "done" && (
          <button onClick={() => setExpanded(v => !v)}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#F0EBE3", color: "#B39C80" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* En cola / procesando */}
      {(order.status === "pending" || order.status === "processing") && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <Loader2 size={13} className="animate-spin" style={{ color: "#A8C4D4" }} />
          <p className="text-xs" style={{ color: "#B39C80" }}>
            {order.status === "pending" ? "En cola..." : "Generando con IA..."}
          </p>
        </div>
      )}

      {/* Error */}
      {order.status === "error" && (
        <div className="flex items-start gap-2 px-4 pb-3">
          <AlertCircle size={13} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
          <p className="text-xs" style={{ color: "#C45A42" }}>
            {order.error ?? "Error al generar."}
          </p>
        </div>
      )}

      {/* ── Detalle expandido ── */}
      {order.status === "done" && expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t" style={{ borderColor: "#F0EBE3" }}>
          {resolving && (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: "#A8C4D4" }} />
            </div>
          )}
          {resolveErr && (
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ backgroundColor: "#FEF0ED" }}>
              <AlertCircle size={13} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
              <p className="text-xs" style={{ color: "#C45A42" }}>
                No se pudieron cargar las imágenes. Verifica tu conexión e intenta de nuevo.
              </p>
            </div>
          )}
          {resolved.map(r => (
            <div key={r.name} className="space-y-2 pt-1">
              <div className="relative rounded-xl overflow-hidden"
                style={{ backgroundColor: "#E8DDD0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.httpsUrl} alt={r.name}
                  className="w-full aspect-square object-cover" loading="lazy" />
                {/* Badge "Generado por IA" desactivado por solicitud
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "#F5856A" }}>
                  Generado por IA
                </span> */}
              </div>
              <button onClick={() => handleDownload(r.httpsUrl, r.name)}
                disabled={dlLoading[r.name]}
                className="w-full h-10 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                style={{ backgroundColor: "#A8C4D4", color: "#2D2B2D" }}>
                {dlLoading[r.name] ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                DESCARGAR IMAGEN
              </button>
            </div>
          ))}
          {Object.entries(order.results).filter(([, v]) => v === "error").map(([name]) => (
            <p key={name} className="text-xs flex items-center gap-1" style={{ color: "#F5856A" }}>
              <AlertCircle size={11} /> {name}: no se pudo generar.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── */

function OrdersContent() {
  const { user } = useAuth();
  const params   = useSearchParams();
  const highlightId = params.get("orderId");

  const [orders, setOrders]     = useState<(Order & { promptName?: string })[]>([]);
  const [loading, setLoading]   = useState(true);
  // Vista "Lista" desactivada temporalmente — solo se muestra "Detalle"
  // const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const viewMode = "detail" as const;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, userId: data.userId, userEmail: data.userEmail ?? "",
          status: data.status,
          promptName: (data.promptNames as string[] | undefined)?.[0] ?? data.promptName ?? null,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
          error: data.error ?? null, results: data.results ?? {},
        };
      }));
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F2EC" }}>

      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#2D2B2D" }}>
        <div>
          <h1 className="text-sm font-semibold text-white">Mis pedidos</h1>
          <p className="text-[11px]" style={{ color: "#C8BAA8" }}>{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Lista / Detalle — desactivado temporalmente, solo Detalle visible
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #4D4B4B" }}>
            <button onClick={() => setViewMode("list")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: viewMode === "list" ? "#3EBF85" : "transparent",
                color: viewMode === "list" ? "white" : "#C8BAA8",
              }}>
              <List size={12} /> Lista
            </button>
            <button onClick={() => setViewMode("detail")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition"
              style={{
                backgroundColor: viewMode === "detail" ? "#3EBF85" : "transparent",
                color: viewMode === "detail" ? "white" : "#C8BAA8",
              }}>
              <LayoutGrid size={12} /> Detalle
            </button>
          </div> */}

          <a href="/upload"
            className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#3EBF85", color: "white" }}>
            <Plus size={12} /> Nuevo
          </a>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "#A8C4D4" }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center py-16">
            <p className="text-sm" style={{ color: "#B39C80" }}>
              Todavía no subiste ninguna foto.
            </p>
            <a href="/upload" className="text-sm font-semibold hover:opacity-70"
              style={{ color: "#3EBF85" }}>
              Subir mi primera imagen →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                highlight={order.id === highlightId}
                defaultExpanded={viewMode === "detail" || order.id === highlightId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return <Suspense><OrdersContent /></Suspense>;
}
