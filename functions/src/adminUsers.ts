import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { FREE_CREDITS } from "./lib/plans";

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

    // 2) Perfil del cliente (rol + estado + créditos del plan gratis de prueba)
    await db.collection("users").doc(uid).set({
      email,
      role,
      active: true,
      createdBy: callerEmail,
      createdAt: now,
      plan: "free",
      credits: FREE_CREDITS,
      planRenewsAt: null,
      planActivatedAt: now,
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

interface ListedUser {
  uid: string;
  email: string;
  role: string;
  active: boolean;
  createdBy: string;
  createdAt: string | null;     // ISO — fecha de creación de la cuenta
  lastSignInAt: string | null;  // ISO — último inicio de sesión (Firebase Auth)
  plan: string;                 // plan actual
  credits: number;              // saldo de créditos
  planRenewsAt: string | null;  // ISO — próxima fecha de reinicio del plan
}

/**
 * Lista los usuarios combinando el perfil de Firestore con la metadata de
 * Firebase Auth (creationTime y lastSignInTime). Solo accesible por admins.
 */
export const adminListUsers = onCall(
  { region: REGION },
  async (req: CallableRequest): Promise<{ users: ListedUser[] }> => {
    await assertAdmin(req.auth?.token?.email);

    const db = admin.firestore();
    const snap = await db.collection("users").get();

    const profiles = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: (data.email as string) ?? "—",
        role: data.role === "admin" ? "admin" : "client",
        active: data.active !== false,
        createdBy: (data.createdBy as string) ?? "—",
        createdAt:
          data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        plan: (data.plan as string) ?? "free",
        credits: typeof data.credits === "number" ? data.credits : 0,
        planRenewsAt: data.planRenewsAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    // Trae metadata de Auth en lotes de 100 (límite de getUsers)
    const authMeta = new Map<string, { created: string | null; lastSignIn: string | null }>();
    for (let i = 0; i < profiles.length; i += 100) {
      const batch = profiles.slice(i, i + 100).map((p) => ({ uid: p.uid }));
      if (batch.length === 0) continue;
      const result = await admin.auth().getUsers(batch);
      for (const u of result.users) {
        authMeta.set(u.uid, {
          created: u.metadata.creationTime
            ? new Date(u.metadata.creationTime).toISOString()
            : null,
          lastSignIn: u.metadata.lastSignInTime
            ? new Date(u.metadata.lastSignInTime).toISOString()
            : null,
        });
      }
    }

    const users: ListedUser[] = profiles.map((p) => {
      const meta = authMeta.get(p.uid);
      return {
        ...p,
        createdAt: p.createdAt ?? meta?.created ?? null,
        lastSignInAt: meta?.lastSignIn ?? null,
      };
    });

    return { users };
  }
);

interface SetPasswordData {
  uid?: string;
  password?: string;
}

/** Cambia la contraseña de una cuenta desde el panel admin. */
export const adminSetUserPassword = onCall(
  { region: REGION },
  async (req: CallableRequest<SetPasswordData>) => {
    await assertAdmin(req.auth?.token?.email);

    const uid = String(req.data?.uid ?? "");
    const password = String(req.data?.password ?? "");

    if (!uid) {
      throw new HttpsError("invalid-argument", "Falta el identificador del usuario.");
    }
    if (password.length < 6) {
      throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
    }

    try {
      await admin.auth().updateUser(uid, { password });
    } catch (err) {
      console.error("updateUser password error:", err);
      throw new HttpsError("internal", "No se pudo cambiar la contraseña.");
    }

    return { ok: true };
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
