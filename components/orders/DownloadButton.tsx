"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadImage } from "@/lib/download";

interface Props {
  url: string;
  filename: string;
  label?: string;
}

export function DownloadButton({ url, filename, label }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadImage(url, filename);
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 w-full h-9 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 active:scale-[0.97] transition disabled:opacity-50"
      aria-label={`Descargar ${label ?? filename}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Download size={13} />
      )}
      {label ?? "Descargar"}
    </button>
  );
}
