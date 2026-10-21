interface Props {
  className?: string;
  dim?: boolean;
  used?: boolean;
  delay?: number;
}

/**
 * Wavy pusaka keris rendered as pure SVG — used for shot pips & emblems.
 */
export default function KerisIcon({ className = '', dim = false, used = false, delay = 0 }: Props) {
  return (
    <svg
      viewBox="0 0 24 88"
      className={`${className} ${used ? 'opacity-20 saturate-0 [transform:rotate(100deg)_scale(0.85)]' : ''}`}
      style={{
        transition: 'transform .35s cubic-bezier(.5,1.6,.4,1), opacity .3s',
        animation: used || dim ? undefined : 'pip-waver 2.6s ease-in-out infinite',
        animationDelay: `${delay}s`,
        filter: dim
          ? undefined
          : used
            ? undefined
            : 'drop-shadow(0 0 6px rgba(238,176,51,0.5))',
      }}
      fill="none"
    >
      <defs>
        <linearGradient id="kerisGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff6cf" />
          <stop offset="45%" stopColor="#eeb033" />
          <stop offset="100%" stopColor="#9c6410" />
        </linearGradient>
      </defs>
      {/* wavy luk blade */}
      <path
        d="M12 4 C16 10 8 16 12 22 C16 28 8 34 12 40 C16 46 8 52 12 58"
        stroke={dim ? 'rgba(238,176,51,0.35)' : 'url(#kerisGold)'}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M12 5 C15 10 9 16 12 21"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={dim || used ? 0 : 0.8}
      />
      {/* ganja wing */}
      <path d="M6 60 L18 60 L12 67 Z" fill={dim ? 'rgba(238,176,51,0.35)' : 'url(#kerisGold)'} />
      {/* mendak */}
      <rect x="8.4" y="66.4" width="7.2" height="3" rx="1.2" fill="#9c6410" opacity={dim ? 0.4 : 1} />
      {/* hulu grip */}
      <path
        d="M12 69 C19.5 69.5 22 80 15.5 84"
        stroke={dim ? 'rgba(122,77,34,0.5)' : '#7a4d22'}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M12 69 C19.5 69.5 22 80 15.5 84"
        stroke="rgba(255,214,140,0.35)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={dim || used ? 0 : 1}
      />
      {/* ruby */}
      <circle cx="12" cy="63.4" r="1.6" fill="#ff4d6d" opacity={dim || used ? 0 : 1} />
    </svg>
  );
}
