import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface UsageStats {
  totalOrders: number;       // total de pedidos creados
  totalGenerations: number;  // total de imágenes solicitadas (suma de estilos)
  doneOrders: number;        // pedidos completados
  errorOrders: number;       // pedidos con error
  byUser: { email: string; count: number }[];   // generaciones por usuario
  byStyle: { name: string; count: number }[];    // uso por estilo
}

/**
 * Lee todos los pedidos y agrega las estadísticas de uso en el cliente.
 * Solo un admin puede leer la colección completa (ver firestore.rules).
 */
export async function getUsageStats(): Promise<UsageStats> {
  const snap = await getDocs(collection(db, "orders"));

  let totalGenerations = 0;
  let doneOrders = 0;
  let errorOrders = 0;
  const userMap = new Map<string, number>();
  const styleMap = new Map<string, number>();

  snap.forEach((d) => {
    const data = d.data();
    const styles: string[] = Array.isArray(data.promptNames)
      ? data.promptNames
      : data.promptName ? [data.promptName] : [];

    totalGenerations += styles.length;
    if (data.status === "done") doneOrders++;
    if (data.status === "error") errorOrders++;

    const email = data.userEmail || "Pruebas anteriores";
    userMap.set(email, (userMap.get(email) ?? 0) + styles.length);

    for (const s of styles) {
      styleMap.set(s, (styleMap.get(s) ?? 0) + 1);
    }
  });

  const byUser = [...userMap.entries()]
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count);

  const byStyle = [...styleMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalOrders: snap.size,
    totalGenerations,
    doneOrders,
    errorOrders,
    byUser,
    byStyle,
  };
}
