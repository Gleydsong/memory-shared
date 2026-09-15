export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="16" cy="16" r="14" stroke="#1a1a1a" strokeWidth="1.5" />
      <circle cx="16" cy="10" r="3" fill="#9fff00" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="10" cy="18" r="3" fill="#9fff00" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="22" cy="18" r="3" fill="#9fff00" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="16" cy="22" r="3" fill="#1a1a1a" />
      <path
        d="M16 13v3M13 18h6M16 19v3"
        stroke="#1a1a1a"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
