export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* sun */}
      <circle cx="34" cy="13" r="5" fill="#caa063" />
      {/* mountains */}
      <path d="M2 40 L16 16 L26 32 L24 40 Z" fill="#316247" />
      <path d="M22 40 L34 20 L46 40 Z" fill="#417c5b" />
      {/* snow cap */}
      <path d="M34 20 L30 26 L33 27 L35 24 L37 27 L38 25 Z" fill="#f1f6f3" />
      {/* tent */}
      <path d="M8 40 L17 27 L26 40 Z" fill="#bd5a3c" />
      <path d="M17 27 L17 40" stroke="#fbf7f0" strokeWidth="1.5" />
      <path d="M14 40 L17 34 L20 40 Z" fill="#71492f" />
      {/* ground */}
      <rect x="0" y="40" width="48" height="3" rx="1.5" fill="#8a5932" />
    </svg>
  );
}
