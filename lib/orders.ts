import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Order {
  id: string;
  uid: string;
  status: "pending" | "processing" | "done" | "error";
  createdAt: Date | null;
  error: string | null;
  results: Record<string, string>;
}

export async function createOrder(uid: string, promptName: string): Promise<string> {
  const orderId = crypto.randomUUID();
  await setDoc(doc(db, "orders", orderId), {
    uid,
    promptName,
    status: "pending",
    createdAt: serverTimestamp(),
    error: null,
    results: {},
  });
  return orderId;
}
