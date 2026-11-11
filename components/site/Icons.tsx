/**
 * Small stroke icons (24×24, currentColor). Decorative unless a label is given. The stroke does not
 * scale with size, so `weight` sets the rendered width to match the adjacent text weight.
 */
const PATHS = {
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.5 9h17 M3.5 15h17 M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z",
  send: "M21 3 10.5 13.5 M21 3l-6.5 18-4-7.5L3 9.5 21 3Z",
  briefcase:
    "M4 7.5h16a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z M8.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2 M3 13h18 M10.5 13v1.5h3V13",
  home: "M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5v-9.5Z",
  idcard:
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M5.8 16c.6-1.5 1.8-2.2 3.2-2.2s2.6.7 3.2 2.2 M14.5 9.5h3.5 M14.5 13h3.5",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.1 8.4 7.5 9.5 4.4-1.1 7.5-4.9 7.5-9.5V6L12 3Z M9 12l2 2 4-4",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.4-2.6 4 M12 17.2v.1",
  building:
    "M5 21V4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V21 M3 21h18 M9 8h1.5 M13.5 8H15 M9 12h1.5 M13.5 12H15 M10.5 21v-4.5h3V21",
  phone:
    "M6.5 3.5h3l1.8 4.6-2.3 1.5a11 11 0 0 0 5.4 5.4l1.5-2.3 4.6 1.8v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z",
  chat: "M4.5 4h15a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H9.5L5 20.5v-4h-.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M8 8.5h8 M8 12h5.5",
  external: "M14 4h6v6 M20 4l-8.5 8.5 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  arrow: "M4.5 12h15 M13.5 6l6 6-6 6",
  close: "M6 6l12 12 M18 6 6 18",
  doc: "M6 3h8.5L19 7.5V21H6V3Z M14 3v5h5 M9 12.5h7 M9 16.5h7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5.5 M12 7.8v.1",
} as const;

const STROKE = { regular: 1.5, semibold: 2, bold: 2.5 } as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "size-5",
  label,
  weight = "semibold",
}: {
  name: IconName;
  className?: string;
  label?: string;
  /** Weight of the text beside the icon: 400 regular, 500–600 semibold, 700 bold. */
  weight?: keyof typeof STROKE;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE[weight]}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Screen-reader note appended to links that open a new tab. */
export function NewTab({ fil = false }: { fil?: boolean }) {
  return <span className="sr-only">{fil ? " (magbubukas sa bagong tab)" : " (opens in a new tab)"}</span>;
}

/** Decorative hero illustration: globe, guide card and a check badge. No official marks. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 230" className={className} aria-hidden="true" focusable="false">
      <circle cx="170" cy="115" r="108" className="fill-white" fillOpacity="0.06" />
      <g fill="none" className="stroke-white" strokeOpacity="0.14" strokeWidth="1.5">
        <ellipse cx="170" cy="115" rx="48" ry="108" />
        <path d="M62 115h216 M78 62h184 M78 168h184" />
      </g>
      <g transform="rotate(-12 120 112)">
        <rect x="70" y="40" width="112" height="146" rx="12" className="fill-surface" />
        <rect x="78" y="48" width="96" height="130" rx="8" className="fill-white" />
        <g fill="none" className="stroke-action" strokeWidth="4">
          <circle cx="126" cy="94" r="22" />
          <ellipse cx="126" cy="94" rx="9" ry="22" />
          <path d="M105 88h42 M105 100h42" />
        </g>
        <rect x="96" y="134" width="60" height="7" rx="3.5" className="fill-masthead" />
        <rect x="96" y="148" width="42" height="7" rx="3.5" className="fill-masthead" fillOpacity="0.35" />
      </g>
      <g transform="rotate(8 230 150)">
        <rect x="168" y="118" width="128" height="64" rx="8" className="fill-white" />
        <path
          d="M186 140l22-9-8 22-4-9-10-4Z"
          fill="none"
          className="stroke-action"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="218" y="134" width="60" height="7" rx="3.5" className="fill-masthead" />
        <rect x="218" y="148" width="44" height="6" rx="3" className="fill-muted" fillOpacity="0.5" />
        <rect x="184" y="166" width="96" height="2" rx="1" className="fill-line" />
      </g>
      <rect
        x="160"
        y="104"
        width="6"
        height="88"
        rx="3"
        className="fill-accent"
        transform="rotate(14 163 148)"
      />
      <path
        d="M40 186c40 20 90 14 130-8s80-70 110-110"
        fill="none"
        className="stroke-accent"
        strokeWidth="2.5"
        strokeDasharray="5 8"
        strokeLinecap="round"
      />
      <circle cx="270" cy="44" r="22" className="fill-accent" />
      <path
        d="M260 44l7 7 13-14"
        fill="none"
        className="stroke-masthead"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
