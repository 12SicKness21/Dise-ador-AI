/**
 * LogoLoader — placeholder animado de carga para imágenes generadas.
 *
 * Muestra el logo circular de Moonkey IA con un anillo de brillo
 * que gira alrededor (efecto conic-gradient rotatorio) y un texto
 * personalizable debajo.
 */
export function LogoLoader({ text = "Preparando tu imagen..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 w-full">

      {/* ── Anillo de brillo + logo ───────────────────────────────── */}
      <div className="relative w-[92px] h-[92px]">

        {/* Conic-gradient que rota: crea el efecto de brillo girando */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #2D2B2D 0%, #2D2B2D 30%, #F5F2EC 55%, #F5F2EC 100%)",
            animation: "spin 1.8s linear infinite",
          }}
        />

        {/* Hueco interior — separa el anillo del logo */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ backgroundColor: "#F5F2EC" }}
        />

        {/* Logo circular */}
        <div className="absolute inset-[6px] rounded-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/Logo_circulo.webp"
            alt="Moonkey IA"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* ── Texto ────────────────────────────────────────────────── */}
      <p
        className="text-[11px] font-bold uppercase tracking-[.18em] text-center"
        style={{ color: "#B39C80" }}
      >
        {text}
      </p>

      {/* ── Keyframe spin — Tailwind animate-spin usa transform pero
          aquí necesitamos que aplique al conic-gradient wrapper ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
