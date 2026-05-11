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
 *   - "auto" (default): círculo oscuro con texto crema — pop sobre la página cream
 *   - "dark":  círculo oscuro con texto crema — sobre fondos claros (igual a auto)
 *   - "light": círculo crema con texto oscuro — sobre fondos oscuros
 *
 * La forma física del logo es siempre la misma. Solo cambia qué color es "tinta"
 * y cuál es "papel".
 */
export function ArtefactMark({ size = 88, className = "", variant = "auto" }: Props) {
  // Default es "dark over light" porque la app vive en light mode editorial.
  const isLightCircle = variant === "light";
  const bg = isLightCircle ? "#FAFAFA" : "#1A1814";
  const fg = isLightCircle ? "#1A1814" : "#FAFAFA";

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
