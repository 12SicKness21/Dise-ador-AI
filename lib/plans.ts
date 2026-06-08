/**
 * Configuración de planes — única fuente de verdad para el frontend.
 *
 * IMPORTANTE: el código NUNCA ata su lógica al nombre del plan. El plan solo
 * sirve para OTORGAR un saldo de créditos. Toda la lógica de generación
 * descuenta créditos. Así se pueden regalar créditos promocionales sin tocar
 * el plan del usuario.
 */

export type PlanKey = "free" | "emprendedor" | "negocio" | "agencia";

export interface Plan {
  key: PlanKey;
  name: string;
  price: number;        // en soles (S/)
  credits: number;      // créditos que otorga al activarse
  profile: string;      // a quién está dirigido
  highlight?: boolean;  // plan destacado en la tabla
}

export const CURRENCY = "S/";

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Gratis",
    price: 0,
    credits: 10,
    profile: "Nuevos usuarios",
  },
  emprendedor: {
    key: "emprendedor",
    name: "Emprendedor",
    price: 39,
    credits: 30,
    profile: "Emprendedores y tiendas pequeñas",
    highlight: true,
  },
  negocio: {
    key: "negocio",
    name: "Negocio activo",
    price: 89,
    credits: 100,
    profile: "Negocios activos en redes",
  },
  agencia: {
    key: "agencia",
    name: "Agencia / Marca",
    price: 179,
    credits: 300,
    profile: "Marcas con catálogo frecuente",
  },
};

export const PLAN_LIST: Plan[] = [
  PLANS.free, PLANS.emprendedor, PLANS.negocio, PLANS.agencia,
];

/** Créditos máximos del plan (para mostrar "24 / 30" en el badge). */
export function planMaxCredits(plan: string | null | undefined): number {
  if (plan && plan in PLANS) return PLANS[plan as PlanKey].credits;
  return PLANS.free.credits;
}

/** Nombre legible del plan. */
export function planName(plan: string | null | undefined): string {
  if (plan && plan in PLANS) return PLANS[plan as PlanKey].name;
  return PLANS.free.name;
}

/** Número de WhatsApp de ventas (sin +). */
export const SALES_WHATSAPP = "51983567826";

/** Construye el enlace de WhatsApp para activar un plan. */
export function planWhatsappLink(plan: Plan): string {
  const msg =
    plan.key === "free"
      ? "Hola Moonkey 21, quiero realizar pruebas gratuitas en Moonkey Studio IA"
      : `Hola Moonkey 21, quiero activar el plan ${plan.name} (${CURRENCY} ${plan.price}/mes) en Moonkey Studio IA`;
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}
