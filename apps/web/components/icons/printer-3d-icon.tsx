import type { SVGProps } from "react";

export function Printer3DIcon({
  className = "h-5 w-5",
  ...props
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Estrutura do Pórtico Z (Colunas Laterais e Topo) */}
      <path d="M4 20V5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5v15" />

      {/* Base Sólida da Impressora */}
      <path
        d="M2 20h20v1.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V20z"
        fill="currentColor"
        fillOpacity="0.15"
      />

      {/* Barra Horizontal do Eixo X (Gantry) */}
      <line x1="4" y1="9" x2="20" y2="9" strokeWidth="2" />

      {/* Cabeçote de Impressão (Carriage / Extrusor) */}
      <rect x="9.5" y="7" width="5" height="4.5" rx="1" fill="currentColor" fillOpacity="0.25" />

      {/* Bico Extrusor (Nozzle apontando para baixo) */}
      <path d="M11 11.5l1 2 1-2" strokeWidth="1.6" />

      {/* Mesa Aquecida (Heated Bed) */}
      <line x1="6" y1="17.5" x2="18" y2="17.5" strokeWidth="2.5" />

      {/* Modelo 3D Sendo Impresso sobre a Mesa (Cubo / Peça) */}
      <path d="M10 17.5v-3h4v3" fill="currentColor" fillOpacity="0.4" strokeWidth="1.4" />

      {/* Detalhe do Carretel de Filamento no Topo */}
      <circle cx="8" cy="2.2" r="1.2" strokeWidth="1.4" />
      <path d="M9.2 2.2c1.2 0 2.8 1.8 2.8 4.8" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
    </svg>
  );
}
