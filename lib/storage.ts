import { ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

/** Lado más largo permitido antes de redimensionar (px). */
const MAX_DIMENSION = 1200;

/** Calidad JPEG para las fotos de zapatillas subidas por usuarios (0–1). */
const UPLOAD_QUALITY = 0.8;

/**
 * Comprime y redimensiona cualquier imagen a JPEG.
 *
 * - Si alguna dimensión supera `maxDimension`, la escala proporcionalmente.
 * - Exporta siempre como image/jpeg con la `quality` indicada.
 * - Libera el Object URL interno al terminar.
 *
 * @param source     File o Blob de imagen (JPEG, PNG, HEIC, WebP, etc.)
 * @param quality    Factor de compresión JPEG (0–1). Default: 0.8
 * @param maxDimension  Lado máximo en píxeles. Default: 1200
 */
export async function compressImage(
  source: File | Blob,
  quality = UPLOAD_QUALITY,
  maxDimension = MAX_DIMENSION
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // ── Calcular dimensiones finales ──────────────────────────────────
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      // ── Dibujar en canvas y exportar ──────────────────────────────────
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob devolvió null"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen para comprimir"));
    };

    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprime la foto y la sube a Storage.
 * Path: uploads/{uid}/{orderId}/original.jpg
 * La Cloud Function escucha este path via onObjectFinalized.
 *
 * La compresión se aplica siempre (no solo a archivos no-JPEG) para garantizar
 * que ninguna imagen supere 1200 px ni ~500 KB, reduciendo costos de Storage
 * y tokens de entrada a Gemini.
 */
export async function uploadOriginal(
  uid: string,
  orderId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  onProgress?.(5);
  const compressed = await compressImage(file, UPLOAD_QUALITY, MAX_DIMENSION);
  onProgress?.(30);

  const fileRef = ref(storage, `uploads/${uid}/${orderId}/original.jpg`);
  await uploadBytes(fileRef, compressed, { contentType: "image/jpeg" });
  onProgress?.(100);
}
