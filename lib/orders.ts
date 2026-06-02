import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  status: "pending" | "processing" | "done" | "error";
  createdAt: Date | null;
  error: string | null;
  results: Record<string, string>;
}

export async function createOrder(
  userId: string,
  userEmail: string,
  selectedPrompts: Array<{ id: string; name: string }>
): Promise<string> {
  const orderId = crypto.randomUUID();
  await setDoc(doc(db, "orders", orderId), {
    userId,
    userEmail,
    promptIds:   selectedPrompts.map((p) => p.id),
    promptNames: selectedPrompts.map((p) => p.name),
    status: "pending",
    createdAt: serverTimestamp(),
    error: null,
    results: {},
  });
  return orderId;
}
