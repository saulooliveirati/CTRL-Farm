import type { SVGProps } from "react";

export function STLFolderIcon({
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
      {/* Contorno da Pasta */}
      <path
        d="M2.5 7.5A1.5 1.5 0 0 1 4 6h4.8a1.5 1.5 0 0 1 1.06.44L11.5 8h8A1.5 1.5 0 0 1 21 9.5v8.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5z"
        fill="currentColor"
        fillOpacity="0.12"
      />

      {/* Aba frontal da Pasta */}
      <path d="M2.5 10.5h19" strokeWidth="1.4" strokeOpacity="0.6" />

      {/* Malha Tridimensional / Facetas STL no interior */}
      {/* Triângulo / Faceta 3D representativa de malha STL */}
      <path
        d="M12 12.5l3.5 2.5-3.5 2.5-3.5-2.5 3.5-2.5z"
        fill="currentColor"
        fillOpacity="0.25"
        strokeWidth="1.4"
      />
      <line x1="12" y1="12.5" x2="12" y2="17.5" strokeWidth="1.2" />
    </svg>
  );
}
