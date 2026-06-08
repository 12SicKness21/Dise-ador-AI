import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Cloud Scheduler no está disponible en southamerica-west1; usamos us-central1.
// (Esta función no es trigger de Storage, así que la región no necesita coincidir.)
const REGION = "us-central1";

/**
 * Renovación mensual de planes.
 *
 * Como los pagos se verifican manualmente por WhatsApp, este proceso solo se
 * encarga de la EXPIRACIÓN: cualquier usuario cuyo `planRenewsAt` ya pasó y que
 * no sea del plan gratis, vuelve al plan gratis con 0 créditos.
 *
 * Cuando el cliente paga su renovación, el admin reactiva el plan desde
 * /admin/clients (lo que fija una nueva fecha de reinicio a +1 mes).
 *
 * Corre todos los días a las 03:00 (hora de Perú).
 */
export const monthlyPlanReset = onSchedule(
  { schedule: "every day 03:00", timeZone: "America/Lima", region: REGION },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Solo trae usuarios con una fecha de reinicio ya vencida.
    // (Los usuarios con planRenewsAt == null no entran en este filtro.)
    const snap = await db
      .collection("users")
      .where("planRenewsAt", "<=", now)
      .get();

    if (snap.empty) {
      console.log("resetExpiredPlans: no hay planes vencidos.");
      return;
    }

    const batch = db.batch();
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (data.plan && data.plan !== "free") {
        batch.update(d.ref, {
          plan: "free",
          credits: 0,
          planRenewsAt: null,
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`resetExpiredPlans: ${count} plan(es) degradado(s) a gratis.`);
  }
);
