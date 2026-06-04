import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

const REGION = "southamerica-west1";

/** Lanza error si el llamante no es administrador (existe en admins/{email}). */
async function assertAdmin(email: string | undefined): Promise<void> {
  if (!email) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const snap = await admin.firestore().collection("admins").doc(email).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Solo los administradores pueden hacer esto.");
  }
}

interface CreateUserData {
  email?: string;
  password?: string;
  role?: string;
}

/**
 * Crea una cuenta de usuario (email + contraseña) desde el panel admin.
 * El admin NO pierde su sesión porque la creación ocurre en el servidor.
 */
export const adminCreateUser = onCall(
  { region: REGION },
  async (req: CallableRequest<CreateUserData>) => {
    const callerEmail = req.auth?.token?.email;
    await assertAdmin(callerEmail);

    const email = String(req.data?.email ?? "").trim().toLowerCase();
    const password = String(req.data?.password ?? "");
    const role = req.data?.role === "admin" ? "admin" : "client";

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Email inválido.");
    }
    if (password.length < 6) {
      throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
    }

    // 1) Crear la cuenta en Firebase Auth
    let uid: string;
    try {
      const record = await admin.auth().createUser({ email, password });
      uid = record.uid;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Ya existe una cuenta con ese email.");
      }
      if (code === "auth/invalid-password") {
        throw new HttpsError("invalid-argument", "Contraseña no válida para Firebase.");
      }
      console.error("createUser error:", err);
      throw new HttpsError("internal", "No se pudo crear la cuenta.");
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // 2) Perfil del cliente (rol + estado)
    await db.collection("users").doc(uid).set({
      email,
      role,
      active: true,
      createdBy: callerEmail,
      createdAt: now,
    });

    // 3) Si es admin, agregarlo a la colección admins (fuente de verdad del rol admin)
    if (role === "admin") {
      await db.collection("admins").doc(email).set({
        addedBy: callerEmail,
        addedAt: now,
      });
    }

    return { uid, email, role };
  }
);

interface DeleteUserData {
  uid?: string;
}

/** Elimina por completo una cuenta (Auth + perfil + admin si aplica). */
export const adminDeleteUser = onCall(
  { region: REGION },
  async (req: CallableRequest<DeleteUserData>) => {
    const callerEmail = req.auth?.token?.email;
    await assertAdmin(callerEmail);

    const uid = String(req.data?.uid ?? "");
    if (!uid) {
      throw new HttpsError("invalid-argument", "Falta el identificador del usuario.");
    }

    const db = admin.firestore();
    const profileSnap = await db.collection("users").doc(uid).get();
    const targetEmail = profileSnap.data()?.email as string | undefined;

    if (targetEmail && targetEmail === callerEmail) {
      throw new HttpsError("failed-precondition", "No puedes eliminar tu propia cuenta.");
    }

    await admin.auth().deleteUser(uid).catch((e) => console.error("deleteUser:", e));
    await db.collection("users").doc(uid).delete().catch(() => undefined);
    if (targetEmail) {
      await db.collection("admins").doc(targetEmail).delete().catch(() => undefined);
    }

    return { ok: true };
  }
);
