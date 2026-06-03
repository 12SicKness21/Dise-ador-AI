"use client";

import { useState } from "react";
import { LogoLoader } from "@/components/LogoLoader";

interface Props {
  src: string;
  alt: string;
  loaderText?: string;
}

/**
 * Muestra el LogoLoader animado dentro del mismo contenedor de la imagen.
 * Cuando la imagen termina de descargarse, hace fade-out del loader y
 * fade-in de la imagen — sin parpadeos ni espacios en blanco intermedios.
 */
export function ImageWithLoader({
  src,
  alt,
  loaderText = "Preparando tu imagen...",
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative w-full aspect-square rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#F5F2EC" }}
    >
      {/* Imagen: opacity 0 hasta que el browser la tenga lista → fade-in */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
      />

      {/* LogoLoader overlay: visible mientras carga → fade-out al terminar */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
        style={{ opacity: loaded ? 0 : 1, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <LogoLoader text={loaderText} />
      </div>
    </div>
  );
}
