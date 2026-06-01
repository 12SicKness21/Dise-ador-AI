import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { defineSecret } from "firebase-functions/params";
import { generateImage } from "./lib/openai";
import {
  getActivePrompts,
  setOrderProcessing,
  setOrderDone,
  setOrderError,
} from "./lib/firestore";
import { slugify } from "./lib/utils";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// System prompt fijo — protege el producto de ser modificado por Gemini
const SYSTEM_PROMPT =
  "You are a strict commercial e-commerce image editor. " +
  "Your only job is to modify the background or add a model wearing the sneaker. " +
  "You MUST keep the product (the sneaker) 100% unaltered — do not modify logos, colors, shapes, or any detail of the shoe. " +
  "Instructions: ";

const UPLOAD_PATTERN = /^uploads\/([^/]+)\/([^/]+)\/original\.jpg$/;

type PromptResult =
  | { label: string; ok: true; path: string }
  | { label: string; ok: false };

export const processUpload = onObjectFinalized(
  {
    region: "southamerica-west1",
    secrets: [GEMINI_API_KEY],
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const filePath = event.data.name;

    const match = filePath.match(UPLOAD_PATTERN);
    if (!match) return;

    const [, uid, orderId] = match;
    const db = admin.firestore();
    const bucket = admin.storage().bucket(event.data.bucket);

    console.log(`Processing order ${orderId} for user ${uid}`);

    try {
      await setOrderProcessing(db, orderId);

      const [imageBuffer] = await bucket.file(filePath).download();

      // Lee los prompts seleccionados — soporta nuevo campo (array) y legacy (string)
      const orderSnap = await db.collection("orders").doc(orderId).get();
      const data = orderSnap.data() ?? {};
      const selectedNames: string[] =
        Array.isArray(data.promptNames)
          ? data.promptNames
          : data.promptName
          ? [data.promptName as string]
          : [];

      const allPrompts = await getActivePrompts(db);
      const prompts =
        selectedNames.length > 0
          ? allPrompts.filter((p) => selectedNames.includes(p.name))
          : allPrompts;

      if (prompts.length === 0) {
        await setOrderError(db, orderId, "No hay prompts activos configurados.");
        return;
      }

      console.log(`Generating ${prompts.length} image(s) in parallel for order ${orderId}`);

      // Generación en paralelo con Promise.all + system prompt fijo
      const settled: PromptResult[] = await Promise.all(
        prompts.map(async (prompt): Promise<PromptResult> => {
          const label = prompt.name;
          try {
            const finalPrompt = SYSTEM_PROMPT + prompt.prompt_text;
            console.log(`Generating "${label}" for order ${orderId}`);

            const pngBuffer = await generateImage(
              GEMINI_API_KEY.value(),
              imageBuffer,
              finalPrompt
            );

            const outputPath = `orders/${orderId}/${slugify(label)}.png`;
            await bucket.file(outputPath).save(pngBuffer, {
              contentType: "image/png",
              metadata: { orderId, promptName: label, uid },
            });

            console.log(`"${label}" OK → ${outputPath}`);
            return { label, ok: true, path: `gs://${bucket.name}/${outputPath}` };
          } catch (err) {
            console.error(`Error generating "${label}":`, err);
            return { label, ok: false };
          }
        })
      );

      const results: Record<string, string> = {};
      for (const r of settled) {
        results[r.label] = r.ok ? r.path : "error";
      }
      const partialError = settled.some((r) => !r.ok);
      const allFailed = settled.every((r) => !r.ok);

      if (allFailed) {
        await setOrderError(db, orderId, "Todas las generaciones fallaron.");
      } else {
        await setOrderDone(db, orderId, results, partialError);
      }

      console.log(`Order ${orderId} done. Results:`, results);
    } catch (err) {
      console.error(`Fatal error processing order ${orderId}:`, err);
      await setOrderError(db, orderId, "Error interno al procesar la imagen.");
    }
  }
);
