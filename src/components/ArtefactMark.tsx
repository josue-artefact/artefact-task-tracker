type Props = {
  size?: number;
  className?: string;
  variant?: "auto" | "dark" | "light";
};

/**
 * Logo de Artefact Studio. SVG inline para escalar nítido y poder invertir
 * colores según el contexto.
 *
 * variant:
 *   - "auto" (default): círculo blanco con texto negro — pop sobre dark background
 *   - "dark":  círculo negro con texto blanco — sobre fondos claros
 *   - "light": círculo blanco con texto negro — sobre fondos oscuros (igual a auto)
 *
 * La forma física del logo es siempre la misma. Solo cambia qué color es "tinta"
 * y cuál es "papel".
 */
export function ArtefactMark({ size = 88, className = "", variant = "auto" }: Props) {
  // Default es "light over dark" porque la app vive en dark mode ahora.
  const isLightBg = variant !== "dark";
  const bg = isLightBg ? "#FAFAFA" : "#0A0A0B";
  const fg = isLightBg ? "#0A0A0B" : "#FAFAFA";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Artefact studio"
    >
      <circle cx="100" cy="100" r="100" fill={bg} />
      <g
        fill={fg}
        fontFamily='"DM Serif Display", "Iowan Old Style", Georgia, serif'
        fontStyle="italic"
        fontWeight="400"
        textAnchor="middle"
      >
        <text x="100" y="100" fontSize="46" letterSpacing="-1.2">Artefact</text>
        <text x="100" y="138" fontSize="40" letterSpacing="-1">studio.</text>
      </g>
    </svg>
  );
}
