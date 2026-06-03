"use client";

import { useEffect, useState } from "react";
import { Loader2, BarChart3, Users, Palette, CheckCircle2, XCircle } from "lucide-react";
import { getUsageStats, type UsageStats } from "@/lib/stats";

export default function StatsPage() {
  const [stats, setStats]     = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    getUsageStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">No se pudieron cargar las estadísticas.</p>
      </div>
    );
  }

  const maxStyle = Math.max(1, ...stats.byStyle.map((s) => s.count));
  const maxUser  = Math.max(1, ...stats.byUser.map((u) => u.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Estadísticas de uso</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Resumen general de generaciones.</p>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={BarChart3}    label="Generaciones" value={stats.totalGenerations} color="#2D2B2D" />
        <StatCard icon={Users}        label="Pedidos"       value={stats.totalOrders}      color="#A8C4D4" />
        <StatCard icon={CheckCircle2} label="Completados"   value={stats.doneOrders}       color="#3EBF85" />
        <StatCard icon={XCircle}      label="Con error"     value={stats.errorOrders}      color="#F5856A" />
      </div>

      {/* ── Uso por estilo ── */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3">
          <Palette size={15} /> Uso por estilo
        </h2>
        {stats.byStyle.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin datos todavía.</p>
        ) : (
          <ul className="space-y-2">
            {stats.byStyle.map((s) => (
              <li key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 uppercase tracking-wide">{s.name}</span>
                  <span className="font-mono text-zinc-500">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(s.count / maxStyle) * 100}%`, backgroundColor: "#3EBF85" }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Uso por usuario ── */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3">
          <Users size={15} /> Generaciones por usuario
        </h2>
        {stats.byUser.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin datos todavía.</p>
        ) : (
          <ul className="space-y-2">
            {stats.byUser.map((u) => (
              <li key={u.email} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 truncate pr-2">{u.email}</span>
                  <span className="font-mono text-zinc-500 shrink-0">{u.count}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(u.count / maxUser) * 100}%`, backgroundColor: "#A8C4D4" }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string; value: number; color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 p-4">
      <Icon size={18} style={{ color }} />
      <p className="text-2xl font-bold mt-2 tracking-tight">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
