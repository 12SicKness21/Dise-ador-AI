import { ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Sube la foto original a Storage.
 * Path: uploads/{uid}/{orderId}/original.jpg
 * La Cloud Function escucha este path via onObjectFinalized.
 */
export async function uploadOriginal(
  uid: string,
  orderId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const fileRef = ref(storage, `uploads/${uid}/${orderId}/original.jpg`);

  // Convertir a JPEG si no lo es (Safari/iOS puede enviar HEIC)
  let blob: Blob = file;
  if (file.type !== "image/jpeg") {
    blob = await convertToJpeg(file);
  }

  onProgress?.(10);
  await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
  onProgress?.(100);
}

async function convertToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
