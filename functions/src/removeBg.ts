import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const REGION = "southamerica-west1";
const REMOVEBG_API_KEY = defineSecret("REMOVEBG_API_KEY");

interface RemoveBgData {
  image?: string; // data URL o base64 de la imagen de entrada (JPEG/PNG)
}

/**
 * Quita el fondo de una imagen usando la API de remove.bg (calidad profesional).
 *
 * - Descuenta 1 crédito de forma atómica (admins exentos).
 * - Reembolsa el crédito si la API falla.
 * - Devuelve el PNG transparente como data URL (base64).
 *
 * El cliente debe enviar la imagen ya redimensionada (≤ ~2000px) para mantener
 * la petición/respuesta dentro de los límites del callable.
 */
export const removeBackgroundPro = onCall(
  {
    region: REGION,
    secrets: [REMOVEBG_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (req: CallableRequest<RemoveBgData>) => {
    const uid = req.auth?.uid;
    const email = req.auth?.token?.email;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const raw = String(req.data?.image ?? "");
    if (!raw) {
      throw new HttpsError("invalid-argument", "Falta la imagen.");
    }
    const b64 = raw.replace(/^data:image\/\w+;base64,/, "");

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    // Los administradores no consumen créditos.
    const isAdminUser = email
      ? (await db.collection("admins").doc(email).get()).exists
      : false;

    // ── Descuento atómico de 1 crédito ──
    if (!isAdminUser) {
      let creditsOk = true;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const credits = typeof snap.data()?.credits === "number" ? snap.data()!.credits : 0;
        if (credits < 1) { creditsOk = false; return; }
        tx.update(userRef, { credits: credits - 1 });
      });
      if (!creditsOk) {
        throw new HttpsError(
          "failed-precondition",
          "Créditos insuficientes. Actualiza tu plan para quitar más fondos."
        );
      }
    }

    const refund = async () => {
      if (!isAdminUser) {
        await userRef
          .update({ credits: admin.firestore.FieldValue.increment(1) })
          .catch((e) => console.error("Error reembolsando crédito:", e));
      }
    };

    try {
      const form = new FormData();
      form.append("image_file_b64", b64);
      form.append("size", "auto");
      form.append("format", "png");

      const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": REMOVEBG_API_KEY.value() },
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        console.error("remove.bg error:", resp.status, txt);
        await refund();
        if (resp.status === 402) {
          throw new HttpsError("resource-exhausted", "El servicio de recorte no tiene saldo. Avisa al administrador.");
        }
        throw new HttpsError("internal", "No se pudo quitar el fondo de esta imagen.");
      }

      const buf = Buffer.from(await resp.arrayBuffer());
      return { image: `data:image/png;base64,${buf.toString("base64")}` };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("removeBackgroundPro fatal:", err);
      await refund();
      throw new HttpsError("internal", "Error al procesar la imagen.");
    }
  }
);
