import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Prompt {
  id: string;
  name: string;
  description: string;
  prompt_text: string;
  active: boolean;
  exampleImageUrl?: string;
  createdAt: Date | null;
  createdBy: string;
  updatedAt: Date | null;
}

export type PromptInput = Omit<Prompt, "id" | "createdAt" | "updatedAt" | "createdBy">;

const COL = "prompts";

export async function getPrompts(): Promise<Prompt[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prompt, "id">),
    createdAt: d.data().createdAt?.toDate() ?? null,
    updatedAt: d.data().updatedAt?.toDate() ?? null,
  }));
}

export async function getActivePrompts(): Promise<Prompt[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("active", "==", true), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prompt, "id">),
    createdAt: d.data().createdAt?.toDate() ?? null,
    updatedAt: d.data().updatedAt?.toDate() ?? null,
  }));
}

export async function createPrompt(data: PromptInput, userEmail: string): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdBy: userEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePrompt(id: string, data: Partial<PromptInput>): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePrompt(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export const INITIAL_PROMPTS: PromptInput[] = [
  {
    name: "MODELO DE PIE",
    description: "Modelo de cuerpo entero de pie, fondo blanco, estilo catálogo",
    prompt_text:
      "Professional sneaker catalog photography, full body shot of a 25-year-old model, head to toe, standing confidently facing camera, wearing sneakers with casual outfit, pure white seamless studio background, soft diffused lighting, sharp focus on footwear, fashion editorial quality, 85mm lens, clean shadow underneath shoes, commercial catalog photography, high resolution, photorealistic.",
    active: true,
  },
  {
    name: "MODELO AGACHADO",
    description: "Modelo agachado en exterior urbano, luz solar, enfoque en zapatillas",
    prompt_text:
      "Fotografía fotorrealista de moda urbana. Joven agachado sobre un bloque de hormigón al aire libre, vistiendo camiseta negra y pantalones cortos amarillo neón. Lleva puestas exactamente las zapatillas de la imagen de referencia. Fondo rústico con lona de sombra y chalecos salvavidas naranjas. Luz solar brillante, enfoque principal y nítido en las zapatillas.",
    active: true,
  },
  {
    name: "FONDO BLANCO",
    description: "Producto solo sobre fondo blanco, listo para e-commerce",
    prompt_text:
      "Ecommerce product photography. White seamless background, clean professional lighting, sharp focus on sneakers, minimal shadows, catalog-ready, high resolution, photorealistic.",
    active: true,
  },
];
