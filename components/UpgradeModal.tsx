"use client";

import { X, Check, Zap, MessageCircle } from "lucide-react";
import { PLAN_LIST, CURRENCY, planWhatsappLink, type Plan } from "@/lib/plans";

/**
 * Modal con la tabla de planes. Cada plan abre WhatsApp con un mensaje
 * prellenado para que el admin verifique el pago y active el plan.
 */
export function UpgradeModal({
  open,
  onClose,
  currentPlan,
}: {
  open: boolean;
  onClose: () => void;
  currentPlan?: string | null;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(45,43,45,.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ backgroundColor: "#F5F2EC" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: "#2D2B2D" }}>
          <div className="flex items-center gap-2">
            <Zap size={16} fill="#A8C4D4" style={{ color: "#A8C4D4" }} />
            <span className="text-sm font-bold text-white tracking-wide">Elige tu plan</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition"
            style={{ backgroundColor: "#3F3D3F", color: "#C8BAA8" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6">
          <p className="text-sm text-center mb-5" style={{ color: "#B39C80" }}>
            Cada imagen generada consume <strong style={{ color: "#2D2B2D" }}>1 crédito</strong>.
            Activa un plan escribiéndonos por WhatsApp — verificamos tu pago y te
            cargamos los créditos al instante.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {PLAN_LIST.map((plan) => (
              <PlanCard key={plan.key} plan={plan} current={currentPlan === plan.key} />
            ))}
          </div>

          <p className="text-[11px] text-center mt-5" style={{ color: "#B39C80" }}>
            Los planes se renuevan cada mes. Tú decides cuándo renovar.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  const isFree = plan.key === "free";
  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{
        backgroundColor: "white",
        border: plan.highlight ? "2px solid #3EBF85" : "1.5px solid #C8BAA8",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold" style={{ color: "#2D2B2D" }}>{plan.name}</h3>
        {plan.highlight && (
          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#E8F8F1", color: "#2E9E6C" }}>
            Popular
          </span>
        )}
        {current && (
          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#EBF5F9", color: "#2E6F8F" }}>
            Tu plan
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-extrabold" style={{ color: "#2D2B2D" }}>
          {CURRENCY} {plan.price}
        </span>
        {!isFree && <span className="text-xs" style={{ color: "#B39C80" }}>/ mes</span>}
      </div>

      <div className="flex items-center gap-1.5 mb-1">
        <Zap size={13} fill="#A8C4D4" style={{ color: "#A8C4D4" }} />
        <span className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
          {plan.credits} imágenes{!isFree ? " al mes" : " de prueba"}
        </span>
      </div>
      <p className="text-[11px] leading-snug mb-3 flex items-start gap-1" style={{ color: "#B39C80" }}>
        <Check size={12} className="mt-0.5 shrink-0" style={{ color: "#3EBF85" }} />
        {plan.profile}
      </p>

      <a
        href={planWhatsappLink(plan)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-1.5 h-10 rounded-full text-xs font-bold transition active:scale-[0.98]"
        style={{
          backgroundColor: isFree ? "#2D2B2D" : "#3EBF85",
          color: "white",
        }}
      >
        <MessageCircle size={14} />
        {isFree ? "Probar gratis" : "Activar plan"}
      </a>
    </div>
  );
}
