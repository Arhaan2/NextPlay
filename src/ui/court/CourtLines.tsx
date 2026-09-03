export function CourtLines() {
  return (
    <g className="court-lines" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="1" />
      <path d="M 2 98 H 98" />
      <path d="M 2 72 H 98" />
      <rect x="32" y="2" width="36" height="26" />
      <path d="M 32 28 H 68" />
      <path d="M 38 28 A 12 12 0 0 0 62 28" />
      <path d="M 44 12 A 6 6 0 0 0 56 12" />
      <path d="M 42 8 H 58" />
      <circle cx="50" cy="11" r="1.4" />
      <path d="M 8 2 V 25 A 45 45 0 0 0 92 25 V 2" />
      <path d="M 2 25 H 8 M 92 25 H 98" />
    </g>
  );
}
