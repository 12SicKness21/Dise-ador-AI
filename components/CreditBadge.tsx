"use client";

import { Zap, Infinity as InfinityIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { planMaxCredits } from "@/lib/plans";

/**
 * Indicador permanente de créditos en el navbar.
 * Muestra "⚡ 24 / 30" (saldo / máximo del plan). Para admins muestra "⚡ ∞".
 */
export function CreditBadge({ onClick }: { onClick?: () => void }) {
  const { credits, plan, isAdmin } = useAuth();

  const low = credits !== null && credits <= 0;

  const content = isAdmin ? (
    <>
      <Zap size={13} fill="currentColor" />
      <InfinityIcon size={14} />
    </>
  ) : credits === null ? (
    <>
      <Zap size={13} />
      <span className="opacity-60">…</span>
    </>
  ) : (
    <>
      <Zap size={13} fill="currentColor" />
      <span>
        {credits} <span className="opacity-50">/ {planMaxCredits(plan)}</span>
      </span>
    </>
  );

  const bg = isAdmin
    ? "#3EBF85"
    : low
    ? "#F5856A"
    : "#A8C4D4";

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold tracking-wide transition active:scale-95"
      style={{ backgroundColor: bg, color: "#2D2B2D" }}
      title={isAdmin ? "Créditos ilimitados (admin)" : "Créditos disponibles"}
    >
      {content}
    </Tag>
  );
}
