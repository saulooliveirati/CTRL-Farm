import type { SVGProps } from "react";

export function FilamentSpoolIcon({
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
      {/* Flange externa do carretel (borda) */}
      <circle cx="12" cy="12" r="9.5" />

      {/* Camadas enroladas de filamento no carretel */}
      <circle
        cx="12"
        cy="12"
        r="7.3"
        strokeWidth="1.3"
        strokeDasharray="3 1.5"
        strokeOpacity="0.85"
      />
      <circle
        cx="12"
        cy="12"
        r="5.3"
        strokeWidth="1.3"
        strokeDasharray="2.5 1.5"
        strokeOpacity="0.85"
      />

      {/* Hub central do carretel (onde apoia no suporte / AMS) */}
      <circle cx="12" cy="12" r="3" strokeWidth="1.6" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />

      {/* Janelas / furos de inspeção do carretel */}
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" strokeWidth="1.5" strokeLinecap="round" />

      {/* Fio de filamento saindo em direção ao extrusor */}
      <path d="M18.7 7.3C20.2 5.8 21.2 4.2 21.8 2.2" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
