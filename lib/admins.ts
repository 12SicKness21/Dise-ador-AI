import {
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const COL = "admins";

export interface AdminEntry {
  email: string;
  addedBy: string;
  addedAt: Date | null;
}

/** Lista todos los administradores (solo accesible por admins). */
export async function getAdmins(): Promise<AdminEntry[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        email: d.id,
        addedBy: data.addedBy ?? "—",
        addedAt: data.addedAt?.toDate?.() ?? null,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Agrega un administrador por email (el doc id ES el email). */
export async function addAdmin(email: string, addedBy: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  await setDoc(doc(db, COL, clean), {
    addedBy,
    addedAt: serverTimestamp(),
  });
}

/** Quita un administrador. */
export async function removeAdmin(email: string): Promise<void> {
  await deleteDoc(doc(db, COL, email));
}
