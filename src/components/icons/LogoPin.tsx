export function LogoPin({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 160 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pinGradLogo" x1="0" y1="0" x2="160" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#1A56A0" />
          <stop offset="100%" stopColor="#0f3460" />
        </linearGradient>
      </defs>
      <path
        d="M80 8 C40 8 8 40 8 80 C8 124 80 192 80 192 C80 192 152 124 152 80 C152 40 120 8 80 8Z"
        fill="url(#pinGradLogo)"
      />
      <circle cx="80" cy="76" r="40" fill="white" opacity="0.08" />
      <ellipse cx="64" cy="48" rx="20" ry="12" fill="white" opacity="0.12" transform="rotate(-20 64 48)" />
      <path d="M54 80 L72 98 L108 58" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
