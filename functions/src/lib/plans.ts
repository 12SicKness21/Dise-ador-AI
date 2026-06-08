/** Configuración de planes (espejo de lib/plans.ts en el frontend). */

export type PlanKey = "free" | "emprendedor" | "negocio" | "agencia";

export interface Plan {
  key: PlanKey;
  name: string;
  price: number;
  credits: number;
}

export const PLANS: Record<PlanKey, Plan> = {
  free:        { key: "free",        name: "Gratis",          price: 0,   credits: 10 },
  emprendedor: { key: "emprendedor", name: "Emprendedor",     price: 39,  credits: 30 },
  negocio:     { key: "negocio",     name: "Negocio activo",  price: 89,  credits: 100 },
  agencia:     { key: "agencia",     name: "Agencia / Marca", price: 179, credits: 300 },
};

/** Créditos iniciales para una cuenta nueva (plan gratis de prueba). */
export const FREE_CREDITS = PLANS.free.credits;
