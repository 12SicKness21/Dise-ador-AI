"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, AlertCircle, Scissors } from "lucide-react";
import { removeBackgroundPro } from "@/lib/backgroundRemoval";

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
 * Quita el fondo de una imagen vía Cloud Function (remove.bg, calidad pro).
 * Consume 1 crédito (descontado en el servidor). Muestra el PNG transparente
 * y permite descargarlo. Reporta el resultado al padre con onSettled.
 */
export function BackgroundRemoval({
  file,
  index,
  onSettled,
}: {
  file: File;
  index: number;
  onSettled?: (ok: boolean) => void;
}) {
  const [status, setStatus] = useState<Status>("processing");
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const dataUrl = await removeBackgroundPro(file);
        setUrl(dataUrl);
        setStatus("done");
        onSettled?.(true);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message ?? "";
        setErrorMsg(
          msg.includes("insuficientes") || msg.includes("failed-precondition")
            ? "Créditos insuficientes para quitar el fondo."
            : "No se pudo quitar el fondo de esta imagen."
        );
        setStatus("error");
        onSettled?.(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            style={{ backgroundColor: "rgba(245,242,236,.9)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EBF5F9" }}>
              <Loader2 size={22} className="animate-spin" style={{ color: "#A8C4D4" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "#2D2B2D" }}>
              Quitando el fondo…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
            style={{ backgroundColor: "rgba(254,240,237,.95)" }}>
            <AlertCircle size={20} style={{ color: "#F5856A" }} />
            <p className="text-sm" style={{ color: "#C45A42" }}>{errorMsg}</p>
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
