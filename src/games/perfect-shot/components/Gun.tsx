export function Gun({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 260" className={className}>
      <defs>
        <linearGradient id="silver" x1="0" x2="1">
          <stop offset="0" stopColor="#7d8994" />
          <stop offset="0.25" stopColor="#f5f8fb" />
          <stop offset="0.55" stopColor="#c3ccd4" />
          <stop offset="0.8" stopColor="#e9eef2" />
          <stop offset="1" stopColor="#6b7681" />
        </linearGradient>
        <linearGradient id="silverDark" x1="0" x2="1">
          <stop offset="0" stopColor="#5d6873" />
          <stop offset="0.5" stopColor="#dfe5ea" />
          <stop offset="1" stopColor="#7a858f" />
        </linearGradient>
        <linearGradient id="gold" x1="0" x2="1">
          <stop offset="0" stopColor="#8a5a10" />
          <stop offset="0.5" stopColor="#ffd56a" />
          <stop offset="1" stopColor="#a8701a" />
        </linearGradient>
        <pattern id="checker" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#6b3f22" />
          <path d="M0 0 H7 M0 0 V7" stroke="#3a1f0e" strokeWidth="1.6" />
        </pattern>
      </defs>

      {/* barrel tip */}
      <rect x="54" y="6" width="18" height="34" rx="3" fill="url(#silver)" stroke="#3b444c" strokeWidth="1.5" />
      <rect x="57" y="4" width="12" height="6" rx="2" fill="#2c343b" />
      <rect x="74" y="18" width="10" height="24" rx="2" fill="url(#silverDark)" stroke="#3b444c" strokeWidth="1.5" />

      {/* grip (behind) */}
      <path
        d="M98 168 L150 152 Q160 150 162 160 L170 240 Q171 250 161 252 L118 262 Q108 264 106 254 Z"
        fill="url(#silverDark)"
        stroke="#3b444c"
        strokeWidth="2"
      />
      <path d="M108 176 L148 164 L156 238 L118 250 Z" fill="url(#checker)" stroke="#2a170a" strokeWidth="1.5" />
      <circle cx="131" cy="206" r="4" fill="url(#gold)" stroke="#5a3a08" strokeWidth="1" />
      <circle cx="117" cy="183" r="2" fill="#c3ccd4" />
      <circle cx="146" cy="232" r="2" fill="#c3ccd4" />

      {/* trigger guard */}
      <path
        d="M98 112 H128 Q138 112 138 122 V150 Q138 160 128 160 H100"
        fill="none"
        stroke="url(#silverDark)"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <path
        d="M98 112 H128 Q138 112 138 122 V150 Q138 160 128 160 H100"
        fill="none"
        stroke="#3b444c"
        strokeWidth="1.2"
        transform="translate(0,-4.5)"
        opacity="0.6"
      />
      <rect x="108" y="119" width="20" height="6" rx="3" fill="#36404a" />
      <path d="M100 128 Q112 136 104 150" stroke="#9aa5ae" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* main slide */}
      <rect x="46" y="36" width="42" height="204" rx="7" fill="url(#silver)" stroke="#3b444c" strokeWidth="2" />
      {/* grooves */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1="52" x2="82" y1={52 + i * 7} y2={52 + i * 7} stroke="#7d8994" strokeWidth="1.5" />
      ))}
      {/* gold window */}
      <rect x="56" y="108" width="20" height="48" rx="3" fill="#2a2f34" />
      <rect x="59" y="112" width="14" height="40" rx="2" fill="url(#gold)" />
      <line x1="56" x2="82" y1="170" y2="170" stroke="#8b96a0" strokeWidth="1.5" />
      <line x1="56" x2="82" y1="200" y2="200" stroke="#8b96a0" strokeWidth="1.5" />

      {/* side rail */}
      <rect x="88" y="58" width="14" height="190" rx="7" fill="url(#silverDark)" stroke="#3b444c" strokeWidth="1.5" />
      {[70, 79, 88, 97].map((y) => (
        <circle key={y} cx="95" cy={y} r="2.6" fill="#62c0ff" style={{ filter: "drop-shadow(0 0 3px #3fa9ff)" }} />
      ))}
      <rect x="91" y="140" width="8" height="34" rx="4" fill="#aab4bd" stroke="#4a545d" strokeWidth="1" />
      <circle cx="95" cy="120" r="2" fill="#3b444c" />

      {/* bottom lever */}
      <path d="M48 228 L36 236 L38 244 L52 240 Z" fill="#20262b" />
      <rect x="66" y="236" width="10" height="16" rx="3" fill="url(#silverDark)" stroke="#3b444c" strokeWidth="1.2" />
    </svg>
  );
}
