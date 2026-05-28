import * as admin from "firebase-admin";

export interface PromptDoc {
  name: string;
  prompt_text: string;
  active: boolean;
}

export async function getActivePrompts(
  db: admin.firestore.Firestore
): Promise<PromptDoc[]> {
  const snap = await db
    .collection("prompts")
    .where("active", "==", true)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => d.data() as PromptDoc);
}

export async function setOrderProcessing(
  db: admin.firestore.Firestore,
  orderId: string
): Promise<void> {
  await db.collection("orders").doc(orderId).update({ status: "processing" });
}

export async function setOrderDone(
  db: admin.firestore.Firestore,
  orderId: string,
  results: Record<string, string>,
  hasPartialError: boolean
): Promise<void> {
  await db.collection("orders").doc(orderId).update({
    status: hasPartialError ? "done" : "done",
    results,
    error: hasPartialError ? "Algunas generaciones fallaron." : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function setOrderError(
  db: admin.firestore.Firestore,
  orderId: string,
  message: string
): Promise<void> {
  await db.collection("orders").doc(orderId).update({
    status: "error",
    error: message,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
