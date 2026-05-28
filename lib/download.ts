import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Convierte una ruta gs:// en una URL HTTPS firmada descargable.
 * Ejemplo: gs://bucket/orders/xyz/modelo_de_pie.png → https://...
 */
export async function resolveGsUrl(gsPath: string): Promise<string> {
  // Extraer el path relativo quitando "gs://bucket/"
  const pathOnly = gsPath.replace(/^gs:\/\/[^/]+\//, "");
  return getDownloadURL(ref(storage, pathOnly));
}

/**
 * Descarga una imagen al dispositivo usando la File API del navegador.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
