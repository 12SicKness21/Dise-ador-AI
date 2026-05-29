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

// Pattern: uploads/{uid}/{orderId}/original.jpg
const UPLOAD_PATTERN = /^uploads\/([^/]+)\/([^/]+)\/original\.jpg$/;

export const processUpload = onObjectFinalized(
  {
    region: "southamerica-west1",
    secrets: [GEMINI_API_KEY],
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    const filePath = event.data.name;

    // Ignorar archivos que no sean el original
    const match = filePath.match(UPLOAD_PATTERN);
    if (!match) return;

    const [, uid, orderId] = match;
    const db = admin.firestore();
    const bucket = admin.storage().bucket(event.data.bucket);

    console.log(`Processing order ${orderId} for user ${uid}`);

    try {
      await setOrderProcessing(db, orderId);

      // Descargar la foto original
      const [imageBuffer] = await bucket.file(filePath).download();

      // Obtener prompts activos
      const prompts = await getActivePrompts(db);
      if (prompts.length === 0) {
        await setOrderError(db, orderId, "No hay prompts activos configurados.");
        return;
      }

      const results: Record<string, string> = {};
      let partialError = false;

      // Generar una imagen por cada prompt activo
      for (const prompt of prompts) {
        const label = prompt.name;
        try {
          console.log(`Generating "${label}" for order ${orderId}`);

          const pngBuffer = await generateImage(
            GEMINI_API_KEY.value(),
            imageBuffer,
            prompt.prompt_text
          );

          const outputPath = `orders/${orderId}/${slugify(label)}.png`;
          await bucket.file(outputPath).save(pngBuffer, {
            contentType: "image/png",
            metadata: { orderId, promptName: label, uid },
          });

          results[label] = `gs://${bucket.name}/${outputPath}`;
          console.log(`"${label}" OK → ${outputPath}`);
        } catch (err) {
          console.error(`Error generating "${label}":`, err);
          results[label] = "error";
          partialError = true;
        }
      }

      const allFailed = Object.values(results).every((v) => v === "error");
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
