export function LogoPin({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pinGradLogo" x1="0" y1="0" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#1A56A0" />
          <stop offset="100%" stopColor="#0f3460" />
        </linearGradient>
        <filter id="pinShadowLogo" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1A56A0" floodOpacity="0.4" />
        </filter>
      </defs>
      <path
        d="M40 4 C20 4 4 20 4 40 C4 62 40 96 40 96 C40 96 76 62 76 40 C76 20 60 4 40 4Z"
        fill="url(#pinGradLogo)"
        filter="url(#pinShadowLogo)"
      />
      <circle cx="40" cy="38" r="20" fill="white" opacity="0.08" />
      <ellipse cx="32" cy="24" rx="10" ry="6" fill="white" opacity="0.12" transform="rotate(-20 32 24)" />
      <path d="M27 40 L36 49 L54 29" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
