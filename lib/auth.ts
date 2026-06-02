import type { User } from "firebase/auth";

// UID del administrador único. Se define en NEXT_PUBLIC_ADMIN_UID (.env.local)
// y se replica como literal en firestore.rules y storage.rules
// (las reglas de Firebase no pueden leer variables de entorno).
const ADMIN_UID =
  process.env.NEXT_PUBLIC_ADMIN_UID ?? "Fb7DhwOnApOl8vT4nF1MlQzE8pm2";

export function isAdmin(user: User | null): boolean {
  return !!user && user.uid === ADMIN_UID;
}
