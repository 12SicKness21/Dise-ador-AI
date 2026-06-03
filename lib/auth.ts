import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Determina si un usuario es administrador.
 *
 * Ya NO usa un UID quemado en el código. En su lugar consulta la colección
 * `admins/{email}` en Firestore — si existe un documento con el email del
 * usuario, es admin. Esto permite agregar/quitar administradores de forma
 * dinámica (desde el panel o la consola) sin redesplegar reglas ni código.
 *
 * Las reglas de Firestore replican esta misma verificación del lado servidor.
 */
export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user?.email) return false;
  try {
    const snap = await getDoc(doc(db, "admins", user.email));
    return snap.exists();
  } catch {
    return false;
  }
}
