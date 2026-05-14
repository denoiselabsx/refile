export function LogoMark({ size = 22, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      <path
        d="M9.5 22.5V9.5H17.2c1.55 0 2.85.5 3.9 1.5 1.05 1 1.575 2.225 1.575 3.675 0 1.183-.35 2.225-1.05 3.125-.7.9-1.617 1.508-2.75 1.825L23.5 22.5h-3.05l-4.275-2.625H12.3V22.5H9.5Zm2.8-5.075h4.825c.85 0 1.554-.258 2.113-.775.558-.517.837-1.183.837-2 0-.833-.279-1.504-.837-2.012-.559-.508-1.263-.763-2.113-.763H12.3v5.55Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LogoWordmark({ size = 22, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: size * 0.82, letterSpacing: "-0.02em" }}
      >
        ReFile
      </span>
    </div>
  );
}
