import {
  collection, doc, getDocs, updateDoc, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export type Role = "client" | "admin";

export interface ClientProfile {
  uid: string;
  email: string;
  role: Role;
  active: boolean;
  createdBy: string;
  createdAt: Date | null;
  lastSignInAt: Date | null;
}

interface ListedUserDTO {
  uid: string;
  email: string;
  role: Role;
  active: boolean;
  createdBy: string;
  createdAt: string | null;
  lastSignInAt: string | null;
}

/**
 * Lista todos los usuarios vía Cloud Function (Admin SDK), que combina el
 * perfil de Firestore con la metadata de Firebase Auth (fecha de creación y
 * último inicio de sesión).
 */
export async function getClients(): Promise<ClientProfile[]> {
  const fn = httpsCallable<unknown, { users: ListedUserDTO[] }>(functions, "adminListUsers");
  const res = await fn({});
  return res.data.users
    .map((u) => ({
      uid: u.uid,
      email: u.email ?? "—",
      role: (u.role === "admin" ? "admin" : "client") as Role,
      active: u.active !== false,
      createdBy: u.createdBy ?? "—",
      createdAt: u.createdAt ? new Date(u.createdAt) : null,
      lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt) : null,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Crea una cuenta (email + contraseña) vía Cloud Function (Admin SDK). */
export async function createClient(
  email: string,
  password: string,
  role: Role
): Promise<{ uid: string }> {
  const fn = httpsCallable<
    { email: string; password: string; role: Role },
    { uid: string; email: string; role: Role }
  >(functions, "adminCreateUser");
  const res = await fn({ email: email.trim().toLowerCase(), password, role });
  return { uid: res.data.uid };
}

/** Activa o suspende una cuenta (bloquea generar pedidos vía reglas). */
export async function setClientActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active });
}

/** Cambia el rol de un usuario y sincroniza la colección admins. */
export async function setClientRole(uid: string, email: string, role: Role): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
  if (role === "admin") {
    await setDoc(doc(db, "admins", email), {
      addedBy: "panel-clientes",
      addedAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(doc(db, "admins", email)).catch(() => undefined);
  }
}

/** Elimina por completo una cuenta vía Cloud Function (Admin SDK). */
export async function deleteClient(uid: string): Promise<void> {
  const fn = httpsCallable<{ uid: string }, { ok: boolean }>(functions, "adminDeleteUser");
  await fn({ uid });
}

/** Cambia la contraseña de una cuenta vía Cloud Function (Admin SDK). */
export async function setClientPassword(uid: string, password: string): Promise<void> {
  const fn = httpsCallable<{ uid: string; password: string }, { ok: boolean }>(
    functions, "adminSetUserPassword"
  );
  await fn({ uid, password });
}
