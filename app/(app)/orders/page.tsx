"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { resolveGsUrl, downloadImage as dlImg } from "@/lib/download";
import type { Order } from "@/lib/orders";
import { Loader2, Plus, Download, AlertCircle, ChevronLeft } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ResolvedResult { name: string; httpsUrl: string; }
type OrderWithMeta = Order & { promptName?: string };

// ─── Paleta ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<Order["status"], string> = {
  pending: "#C8BAA8", processing: "#A8C4D4", done: "#3EBF85", error: "#F5856A",
};
const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "En cola", processing: "Procesando", done: "Listo", error: "Error",
};

// ─── OrderListItem ─────────────────────────────────────────────────────────────

function OrderListItem({
  order, selected, onClick,
}: {
  order: OrderWithMeta;
  selected: boolean;
  onClick: () => void;
}) {
  const date = order.createdAt
    ? new Intl.DateTimeFormat("es", {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      }).format(order.createdAt)
    : "";

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center gap-3 rounded-xl transition-all"
      style={{
        backgroundColor: selected ? "#E8F8F1" : "transparent",
        border: `1.5px solid ${selected ? "#3EBF85" : "transparent"}`,
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: STATUS_COLOR[order.status] }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-semibold" style={{ color: "#2D2B2D" }}>
            #{order.id.slice(0, 8)}
          </span>
          {order.promptName && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0"
              style={{ backgroundColor: "#E8DDD0", color: "#B39C80" }}
            >
              {order.promptName}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {date && <p className="text-[11px]" style={{ color: "#B39C80" }}>{date}</p>}
          <span className="text-[9px] font-bold ml-auto" style={{ color: STATUS_COLOR[order.status] }}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── OrderDetail ───────────────────────────────────────────────────────────────

function OrderDetail({
  order, resolved, resolving, resolveError, onClose,
}: {
  order: OrderWithMeta | null;
  resolved: ResolvedResult[];
  resolving: boolean;
  resolveError: boolean;
  onClose?: () => void;
}) {
  const [dlLoading, setDlLoading] = useState<Record<string, boolean>>({});

  async function handleDownload(url: string, name: string) {
    setDlLoading(p => ({ ...p, [name]: true }));
    try { await dlImg(url, `moonkey_${name.toLowerCase().replace(/\s+/g, "_")}.png`); }
    catch { window.open(url, "_blank", "noopener"); }
    finally { setDlLoading(p => ({ ...p, [name]: false })); }
  }

  // ── Pantalla vacía ────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "#E8DDD0" }}
        >
          <Download size={24} style={{ color: "#B39C80" }} />
        </div>
        <p className="text-sm text-center" style={{ color: "#B39C80" }}>
          Selecciona un pedido<br />para ver el detalle
        </p>
      </div>
    );
  }

  const date = order.createdAt
    ? new Intl.DateTimeFormat("es", {
        day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
      }).format(order.createdAt)
    : "";

  return (
    <div className="h-full overflow-y-auto px-5 py-5">

      {/* Cabecera del detalle */}
      <div className="flex items-start gap-3 mb-6">
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 lg:hidden"
            style={{ backgroundColor: "#F0EBE3" }}
          >
            <ChevronLeft size={16} style={{ color: "#2D2B2D" }} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-bold" style={{ color: "#2D2B2D" }}>
              #{order.id.slice(0, 8)}
            </span>
            {order.promptName && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                style={{ backgroundColor: "#E8DDD0", color: "#B39C80" }}
              >
                {order.promptName}
              </span>
            )}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0"
              style={{
                backgroundColor: `${STATUS_COLOR[order.status]}22`,
                color: STATUS_COLOR[order.status],
              }}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          {date && <p className="text-xs mt-0.5" style={{ color: "#B39C80" }}>{date}</p>}
        </div>
      </div>

      {/* ── Pendiente / Procesando ── */}
      {(order.status === "pending" || order.status === "processing") && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="animate-spin" style={{ color: "#A8C4D4" }} />
          <p className="text-sm" style={{ color: "#B39C80" }}>
            {order.status === "pending" ? "En cola..." : "Generando con IA..."}
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {order.status === "error" && (
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "#FEF0ED" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
          <p className="text-sm" style={{ color: "#C45A42" }}>{order.error ?? "Error al generar."}</p>
        </div>
      )}

      {/* ── Done ── */}
      {order.status === "done" && (
        <>
          {resolving && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin" style={{ color: "#A8C4D4" }} />
            </div>
          )}

          {resolveError && (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "#FEF0ED" }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#F5856A" }} />
              <p className="text-sm" style={{ color: "#C45A42" }}>
                No se pudieron cargar las imágenes. Verifica tu conexión.
              </p>
            </div>
          )}

          <div className="space-y-8">
            {resolved.map(r => (
              <div key={r.name} className="space-y-3">
                {/* Imagen en alta resolución — next/image con unoptimized:
                    Las URLs de Firebase Storage incluyen tokens de autenticación
                    que funcionan como cache key único. Usamos unoptimized para
                    evitar el límite de Vercel (1000 optimizaciones/mes en Hobby)
                    y porque las imágenes ya vienen comprimidas desde el upload. */}
                <div
                  className="relative w-full aspect-square rounded-2xl overflow-hidden"
                  style={{ backgroundColor: "#F5F2EC" }}
                >
                  <Image
                    key={r.httpsUrl}
                    src={r.httpsUrl}
                    alt={r.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 65vw"
                    loading="lazy"
                    unoptimized
                  />
                </div>

                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#B39C80" }}>
                  {r.name}
                </p>

                {/* Botón de descarga prominente */}
                <button
                  onClick={() => handleDownload(r.httpsUrl, r.name)}
                  disabled={dlLoading[r.name]}
                  className="w-full h-14 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "#2D2B2D", color: "white" }}
                >
                  {dlLoading[r.name]
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Download size={16} />}
                  DESCARGAR IMAGEN
                </button>
              </div>
            ))}

            {/* Resultados con error parcial */}
            {Object.entries(order.results)
              .filter(([, v]) => v === "error")
              .map(([name]) => (
                <p key={name} className="text-xs flex items-center gap-1" style={{ color: "#F5856A" }}>
                  <AlertCircle size={11} /> {name}: no se pudo generar.
                </p>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── OrdersContent ─────────────────────────────────────────────────────────────

function OrdersContent() {
  const { user } = useAuth();
  const params      = useSearchParams();
  const highlightId = params.get("orderId");

  const [orders, setOrders]     = useState<OrderWithMeta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);
  const [mobileOpen, setMobileOpen] = useState(!!highlightId);

  // Cache de resultados resueltos: orderId → ResolvedResult[]
  const [resolvedMap,   setResolvedMap]   = useState<Map<string, ResolvedResult[]>>(new Map());
  const [resolvingSet,  setResolvingSet]  = useState<Set<string>>(new Set());
  const [errorSet,      setErrorSet]      = useState<Set<string>>(new Set());

  const hasAutoSelected = useRef(false);

  // ── Suscripción en tiempo real ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const docs: OrderWithMeta[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id:         d.id,
          userId:     data.userId,
          userEmail:  data.userEmail ?? "",
          status:     data.status,
          promptName: (data.promptNames as string[] | undefined)?.[0]
                      ?? data.promptName
                      ?? null,
          createdAt:  data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate()
                        : null,
          error:   data.error ?? null,
          results: data.results ?? {},
        };
      });

      setOrders(docs);
      setLoading(false);

      // Auto-seleccionar el primer pedido al cargar (solo una vez)
      if (!hasAutoSelected.current && docs.length > 0) {
        setSelectedId(highlightId ?? docs[0].id);
        hasAutoSelected.current = true;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Resolver URLs cuando se selecciona un pedido "done" ────────────────
  useEffect(() => {
    if (!selectedId) return;
    const order = orders.find(o => o.id === selectedId);
    if (!order || order.status !== "done") return;
    if (resolvedMap.has(selectedId) || resolvingSet.has(selectedId)) return;

    const entries = Object.entries(order.results).filter(([, v]) => v !== "error");
    if (!entries.length) return;

    setResolvingSet(prev => new Set(prev).add(selectedId));

    Promise.all(entries.map(async ([name, gsPath]) => ({
      name, httpsUrl: await resolveGsUrl(gsPath),
    })))
      .then(results => {
        setResolvedMap(prev  => new Map(prev).set(selectedId, results));
        setResolvingSet(prev => { const s = new Set(prev); s.delete(selectedId); return s; });
      })
      .catch(() => {
        setErrorSet(prev    => new Set(prev).add(selectedId));
        setResolvingSet(prev => { const s = new Set(prev); s.delete(selectedId); return s; });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, orders]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileOpen(true);
  }

  const selectedOrder = orders.find(o => o.id === selectedId) ?? null;
  const detailProps = {
    order:        selectedOrder,
    resolved:     resolvedMap.get(selectedId ?? "")  ?? [],
    resolving:    resolvingSet.has(selectedId ?? ""),
    resolveError: errorSet.has(selectedId ?? ""),
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F2EC" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: "#2D2B2D" }}
      >
        <div>
          <h1 className="text-sm font-semibold text-white">Mis pedidos</h1>
          <p className="text-[11px]" style={{ color: "#C8BAA8" }}>{user?.email}</p>
        </div>
        <a
          href="/upload"
          className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: "#3EBF85", color: "white" }}
        >
          <Plus size={12} /> Nuevo
        </a>
      </header>

      {/* ── Cuerpo ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={20} className="animate-spin" style={{ color: "#A8C4D4" }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 text-center py-20">
          <p className="text-sm" style={{ color: "#B39C80" }}>
            Todavía no subiste ninguna foto.
          </p>
          <a href="/upload" className="text-sm font-semibold hover:opacity-70" style={{ color: "#3EBF85" }}>
            Subir mi primera imagen →
          </a>
        </div>
      ) : (
        /* ── Split Panel ──────────────────────────────────────────────────── */
        <div className="flex-1 flex overflow-hidden">

          {/* Columna izquierda — lista scrollable */}
          <div
            className="w-full lg:w-[35%] lg:max-w-[420px] overflow-y-auto shrink-0 border-r"
            style={{ borderColor: "#E8DDD0" }}
          >
            <div className="p-3 space-y-1">
              {orders.map(order => (
                <OrderListItem
                  key={order.id}
                  order={order}
                  selected={order.id === selectedId}
                  onClick={() => handleSelect(order.id)}
                />
              ))}
            </div>
          </div>

          {/* Columna derecha — detalle sticky (solo desktop) */}
          <div
            className="hidden lg:flex flex-col flex-1 overflow-hidden"
            style={{ backgroundColor: "white" }}
          >
            <OrderDetail {...detailProps} />
          </div>

        </div>
      )}

      {/* ── Modal / bottom-sheet (mobile) ── */}
      {mobileOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sheet */}
          <div
            className="rounded-t-3xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: "white",
              maxHeight: "90dvh",
              minHeight: "55dvh",
            }}
          >
            {/* Handle visual */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#C8BAA8" }} />
            </div>
            <div className="flex-1 overflow-hidden">
              <OrderDetail
                {...detailProps}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return <Suspense><OrdersContent /></Suspense>;
}
