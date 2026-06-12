import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/**
 * Redimensiona una imagen (lado máximo `maxDim`) y la devuelve como data URL
 * JPEG. Mantener el tamaño acotado evita exceder los límites del callable y
 * reduce el costo/latencia de la API de recorte.
 */
function resizeToDataURL(file: File, maxDim = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No se pudo procesar la imagen.")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagen inválida.")); };
    img.src = url;
  });
}

/**
 * Quita el fondo de una imagen vía Cloud Function (remove.bg, calidad pro).
 * Consume 1 crédito (lo descuenta el servidor de forma atómica).
 * Devuelve un data URL PNG con fondo transparente.
 */
export async function removeBackgroundPro(file: File): Promise<string> {
  const image = await resizeToDataURL(file);
  const fn = httpsCallable<{ image: string }, { image: string }>(
    functions, "removeBackgroundPro"
  );
  const res = await fn({ image });
  return res.data.image;
}
