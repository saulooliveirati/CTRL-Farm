import type { SVGProps } from "react";

export function SpoolGraphic({
  colorHex,
  ratio = 1,
  size = 72,
  className = "",
  ...props
}: {
  colorHex: string;
  ratio?: number;
  size?: number;
  className?: string;
} & SVGProps<SVGSVGElement>) {
  // Clamped ratio between 0 and 1
  const clampedRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));

  // Geometry dimensions relative to viewBox 100x100
  const center = 50;
  const hubRadius = 16;
  const maxFilamentRadius = 42;
  const outerFlangeRadius = 47;

  // Current wound coil radius based on remaining percentage
  const currentCoilRadius = hubRadius + (maxFilamentRadius - hubRadius) * clampedRatio;
  const coilThickness = currentCoilRadius - hubRadius;
  const coilMidRadius = hubRadius + coilThickness / 2;

  // Safe color hex fallback
  const validHex = /^#[0-9A-Fa-f]{3,8}$/.test(colorHex) ? colorHex : "#38bdf8";

  // Unique IDs for SVG filters/gradients
  const gradId = `spool-grad-${validHex.replace("#", "")}`;
  const rimGradId = `spool-rim-grad`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 drop-shadow-md select-none ${className}`}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Gradiente da borda externa do carretel (flange plástico escuro/translúcido) */}
        <radialGradient id={rimGradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="60%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>

        {/* Gradiente dinâmico do filamento real com sombra e brilho de reflexo */}
        <radialGradient id={gradId} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="25%" stopColor={validHex} stopOpacity="1" />
          <stop offset="100%" stopColor={validHex} stopOpacity="0.8" />
        </radialGradient>
      </defs>

      {/* Sombra de projeção suave da base */}
      <circle cx={center} cy={center + 2} r={outerFlangeRadius} fill="#000000" fillOpacity="0.35" />

      {/* Flange externo (corpo principal do carretel) */}
      <circle
        cx={center}
        cy={center}
        r={outerFlangeRadius}
        fill={`url(#${rimGradId})`}
        stroke="#475569"
        strokeWidth="1.8"
      />

      {/* Borda interna do flange (rebaixo de contenção do filamento) */}
      <circle
        cx={center}
        cy={center}
        r={maxFilamentRadius + 1}
        fill="#090d16"
        stroke="#1e293b"
        strokeWidth="1.2"
      />

      {/* Bobina de Filamento Enrolada (visível proporcionalmente ao peso restante) */}
      {coilThickness > 0.5 && (
        <g>
          {/* Anel de filamento principal */}
          <circle
            cx={center}
            cy={center}
            r={coilMidRadius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={coilThickness}
          />

          {/* Linhas de textura das espiras de filamento (coils) */}
          {clampedRatio > 0.25 && (
            <circle
              cx={center}
              cy={center}
              r={hubRadius + coilThickness * 0.45}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeOpacity="0.25"
              strokeDasharray="4 2"
            />
          )}
          {clampedRatio > 0.65 && (
            <circle
              cx={center}
              cy={center}
              r={hubRadius + coilThickness * 0.8}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeOpacity="0.2"
              strokeDasharray="5 2.5"
            />
          )}
        </g>
      )}

      {/* Se o carretel estiver 100% esgotado (vazio), exibe aviso sutil de vazio no centro */}
      {clampedRatio === 0 && (
        <circle
          cx={center}
          cy={center}
          r={hubRadius + 3}
          fill="#0f172a"
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      )}

      {/* Hub central do carretel (cilindro central do núcleo) */}
      <circle
        cx={center}
        cy={center}
        r={hubRadius}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.6"
      />

      {/* Furo central do eixo (arbor hole / suporte de fixação na impressora / AMS) */}
      <circle
        cx={center}
        cy={center}
        r={hubRadius * 0.55}
        fill="#070c16"
        stroke="#0f172a"
        strokeWidth="1.4"
      />

      {/* Furos / janelas radiais de inspeção na carcaça do carretel (estilo carretel moderno) */}
      <circle cx={center} cy={13} r="2.8" fill="#0b1220" stroke="#334155" strokeWidth="1" />
      <circle cx={center} cy={87} r="2.8" fill="#0b1220" stroke="#334155" strokeWidth="1" />
      <circle cx={13} cy={center} r="2.8" fill="#0b1220" stroke="#334155" strokeWidth="1" />
      <circle cx={87} cy={center} r="2.8" fill="#0b1220" stroke="#334155" strokeWidth="1" />

      {/* Guia / ponta de filamento saindo em direção ao tubo PTFE ou extrusor */}
      {clampedRatio > 0 && (
        <path
          d={`M ${center + currentCoilRadius * 0.72} ${center - currentCoilRadius * 0.72} C 78 22, 88 16, 94 8`}
          fill="none"
          stroke={validHex}
          strokeWidth="2.4"
          strokeLinecap="round"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
        />
      )}
    </svg>
  );
}
