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
 * Descarga una imagen al dispositivo.
 * Intenta blob download (desktop con CORS configurado).
 * Si falla por CORS o restricciones del navegador, abre en nueva pestaña.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Fallback: abre en nueva pestaña (funciona en móvil y cuando CORS no está configurado)
    window.open(url, "_blank", "noopener");
  }
}
