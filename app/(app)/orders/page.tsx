"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { OrderCard } from "@/components/orders/OrderCard";
import type { Order } from "@/lib/orders";
import { Loader2, Plus } from "lucide-react";

function OrdersContent() {
  const { user } = useAuth();
  const params = useSearchParams();
  const highlightId = params.get("orderId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          status: data.status,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : null,
          error: data.error ?? null,
          results: data.results ?? {},
        } as Order;
      });
      setOrders(docs);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-sm mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold tracking-tight">Mis pedidos</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{user?.email}</p>
        </div>
        <a
          href="/upload"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 transition"
        >
          <Plus size={13} />
          Nuevo
        </a>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16">
          <p className="text-sm text-zinc-500">Todavía no subiste ninguna foto.</p>
          <a
            href="/upload"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Subir mi primera zapatilla →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              highlight={order.id === highlightId}
            />
          ))}
        </div>
      )}
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
