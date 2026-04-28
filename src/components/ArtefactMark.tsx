type Props = {
  size?: number;
  className?: string;
  variant?: "dark" | "light";
};

/** Recreated Artefact studio. mark — italic serif on a black disk. */
export function ArtefactMark({ size = 88, className = "", variant = "dark" }: Props) {
  const bg = variant === "dark" ? "#0A0907" : "#FDFBF7";
  const fg = variant === "dark" ? "#FDFBF7" : "#0A0907";
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
