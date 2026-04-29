export default function Logo({ size = 40, showWordmark = true }) {
  return (
    <div className="logo" style={{ ['--logo-size']: `${size}px` }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="logoGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#logoGradient)" />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="16"
          fill="none"
          stroke="url(#logoGlow)"
          strokeWidth="1"
          opacity="0.6"
        />
        <path d="M24 19 L48 32 L24 45 Z" fill="#0a0a0f" />
        <circle cx="14" cy="14" r="2.5" fill="#0a0a0f" opacity="0.35" />
        <circle cx="50" cy="50" r="2.5" fill="#0a0a0f" opacity="0.35" />
      </svg>
      {showWordmark && <span className="logo-wordmark">VIRADA-VIDEO</span>}
    </div>
  );
}
