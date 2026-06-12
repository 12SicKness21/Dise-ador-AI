"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, AlertCircle, Scissors } from "lucide-react";

/* Fondo a cuadros para previsualizar la transparencia */
const CHECKER = {
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg,#dcdcdc 25%,transparent 25%)," +
    "linear-gradient(-45deg,#dcdcdc 25%,transparent 25%)," +
    "linear-gradient(45deg,transparent 75%,#dcdcdc 75%)," +
    "linear-gradient(-45deg,transparent 75%,#dcdcdc 75%)",
  backgroundSize: "18px 18px",
  backgroundPosition: "0 0,0 9px,9px -9px,-9px 0",
};

type Status = "processing" | "done" | "error";

/**
 * Quita el fondo de una imagen 100% en el navegador (@imgly/background-removal,
 * WASM). No sube nada a Firebase ni consume créditos. La librería se carga de
 * forma diferida (dynamic import) solo cuando este componente se monta.
 */
export function BackgroundRemoval({ file, index }: { file: File; index: number }) {
  const [status, setStatus]     = useState<Status>("processing");
  const [url, setUrl]           = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;   // evita doble ejecución (StrictMode)
    startedRef.current = true;

    (async () => {
      try {
        // Carga diferida: la librería pesada solo se descarga al usarla.
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(file, {
          output: { format: "image/png" },
          progress: (_key: string, current: number, total: number) => {
            if (total > 0) setProgress(Math.round((current / total) * 100));
          },
        });
        const objectUrl = URL.createObjectURL(blob);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setStatus("done");
      } catch (e) {
        console.error("Background removal error:", e);
        setStatus("error");
      }
    })();

    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [file]);

  function handleDownload() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `sin_fondo_${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-2.5">
      <div className="relative rounded-2xl overflow-hidden aspect-square" style={CHECKER}>
        {status === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ backgroundColor: "rgba(245,242,236,.85)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EBF5F9" }}>
              <Loader2 size={22} className="animate-spin" style={{ color: "#A8C4D4" }} />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
                Quitando el fondo… {progress > 0 ? `${progress}%` : ""}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "#B39C80" }}>
                La primera vez puede tardar (descarga el modelo).
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
            style={{ backgroundColor: "rgba(254,240,237,.95)" }}>
            <AlertCircle size={20} style={{ color: "#F5856A" }} />
            <p className="text-sm" style={{ color: "#C45A42" }}>
              No se pudo quitar el fondo de esta imagen.
            </p>
          </div>
        )}

        {status === "done" && url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Sin fondo ${index + 1}`}
              className="w-full h-full object-contain" />
            <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: "#2D2B2D" }}>
              <Scissors size={11} /> Sin fondo
            </span>
          </>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={status !== "done"}
        className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: "#A8C4D4", color: "#2D2B2D" }}
      >
        <Download size={15} />
        DESCARGAR PNG
      </button>
    </div>
  );
}
