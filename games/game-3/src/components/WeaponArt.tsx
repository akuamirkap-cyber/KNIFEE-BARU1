import type { ReactElement } from 'react';

/* Hand-drawn 2D weapon illustrations (SVG), side view. Each fits a 260x150 box. */

export type ArmoryId = 'pistol' | 'ak47' | 'nailgun' | 'crossbow' | 'plasma' | 'laser';

const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#f6f8fb" />
      <stop offset="0.35" stopColor="#c3cad4" />
      <stop offset="0.6" stopColor="#8a929e" />
      <stop offset="1" stopColor="#4a515c" />
    </linearGradient>
    <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5c636e" />
      <stop offset="0.5" stopColor="#2b3038" />
      <stop offset="1" stopColor="#12151a" />
    </linearGradient>
    <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#e2a35a" />
      <stop offset="0.45" stopColor="#b86f2a" />
      <stop offset="1" stopColor="#6a3a12" />
    </linearGradient>
    <linearGradient id={`${id}-woodDark`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#8a5a2e" />
      <stop offset="0.5" stopColor="#5a3416" />
      <stop offset="1" stopColor="#2e1808" />
    </linearGradient>
    <linearGradient id={`${id}-yellow`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffe36a" />
      <stop offset="0.5" stopColor="#f5b400" />
      <stop offset="1" stopColor="#b57a00" />
    </linearGradient>
    <linearGradient id={`${id}-white`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.5" stopColor="#e6e9f2" />
      <stop offset="1" stopColor="#aab1c2" />
    </linearGradient>
    <linearGradient id={`${id}-gun`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3f4a5c" />
      <stop offset="0.5" stopColor="#1c2330" />
      <stop offset="1" stopColor="#0b0f16" />
    </linearGradient>
    <radialGradient id={`${id}-green`} cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stopColor="#eaffd0" />
      <stop offset="0.35" stopColor="#7dff4a" />
      <stop offset="1" stopColor="#0f7a1a" />
    </radialGradient>
    <radialGradient id={`${id}-red`} cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stopColor="#ffe3e3" />
      <stop offset="0.35" stopColor="#ff3b3b" />
      <stop offset="1" stopColor="#8a0a14" />
    </radialGradient>
    <filter id={`${id}-glowG`} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="b" />
      <feFlood floodColor="#6cff3a" floodOpacity="0.9" />
      <feComposite in2="b" operator="in" />
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id={`${id}-glowR`} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3.5" result="b" />
      <feFlood floodColor="#ff2a4a" floodOpacity="0.9" />
      <feComposite in2="b" operator="in" />
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
    </filter>
    <pattern id={`${id}-grip`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" fill="#2a1a0e" />
      <rect width="2.2" height="5" fill="#4a2e18" />
    </pattern>
    <pattern id={`${id}-gripRubber`} width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#15181d" />
      <circle cx="2" cy="2" r="1" fill="#2f353d" />
    </pattern>
  </defs>
);

const outline = { stroke: '#07090d', strokeWidth: 1.6, strokeLinejoin: 'round' as const };

export function Pistol({ id = 'p' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(18 10)">
        {/* grip */}
        <path d="M58 76 L96 76 L84 134 Q82 140 76 140 L50 140 Q44 140 45 134 Z" fill={`url(#${id}-dark)`} {...outline} />
        <path d="M63 84 L90 84 L80 130 L54 130 Z" fill={`url(#${id}-grip)`} stroke="#000" strokeWidth="1" />
        <circle cx="72" cy="104" r="2.6" fill="#9aa3ae" stroke="#000" strokeWidth="0.8" />
        {/* magazine base */}
        <rect x="46" y="136" width="36" height="7" rx="2" fill="#1a1e24" stroke="#000" />
        {/* frame */}
        <path d="M44 62 L212 62 L212 80 L150 80 Q140 80 136 86 L130 94 L108 94 L104 80 L44 80 Z" fill={`url(#${id}-dark)`} {...outline} />
        {/* trigger guard */}
        <path d="M100 80 Q94 110 118 112 L134 112 Q140 112 136 104 L130 90" fill="none" stroke="#1a1e24" strokeWidth="6" strokeLinecap="round" />
        <path d="M100 80 Q94 110 118 112 L134 112 Q140 112 136 104 L130 90" fill="none" stroke="#5c636e" strokeWidth="2" strokeLinecap="round" />
        {/* trigger */}
        <path d="M118 84 Q112 94 116 104" fill="none" stroke="#c3cad4" strokeWidth="4" strokeLinecap="round" />
        {/* accessory rail */}
        <rect x="140" y="72" width="60" height="6" fill="#0f1216" />
        {[146, 156, 166, 176, 186].map((x) => <rect key={x} x={x} y="72" width="4" height="6" fill="#3a414b" />)}
        {/* slide */}
        <path d="M36 32 L206 32 Q222 32 222 46 L222 56 Q222 64 214 64 L36 64 Q30 64 30 58 L30 38 Q30 32 36 32 Z" fill={`url(#${id}-steel)`} {...outline} />
        <path d="M36 34 L204 34 L204 42 L36 42 Z" fill="#ffffff" opacity="0.45" />
        <path d="M30 56 L222 56 L222 60 L30 60 Z" fill="#000" opacity="0.25" />
        {/* serrations */}
        {[44, 50, 56, 62, 68, 74].map((x) => <path key={x} d={`M${x} 36 L${x - 2} 60`} stroke="#5a616c" strokeWidth="2" />)}
        {/* ejection port */}
        <rect x="120" y="38" width="42" height="14" rx="2" fill="#2b3038" stroke="#000" strokeWidth="1" />
        <rect x="123" y="40" width="36" height="5" fill="#0f1216" />
        {/* sights */}
        <rect x="40" y="26" width="10" height="7" fill="#1c2026" stroke="#000" />
        <rect x="206" y="26" width="6" height="7" fill="#1c2026" stroke="#000" />
        <rect x="208" y="27" width="2" height="3" fill="#7dff4a" />
        {/* hammer */}
        <path d="M30 44 L22 36 Q18 34 20 40 L26 50 Z" fill="#2b3038" stroke="#000" />
        {/* muzzle */}
        <ellipse cx="222" cy="48" rx="3" ry="8" fill="#1a1e24" />
        <ellipse cx="222" cy="48" rx="1.6" ry="4" fill="#000" />
        {/* branding line */}
        <path d="M90 50 L190 50" stroke="#6b7480" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function AK47({ id = 'a' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(0 6)">
        {/* stock */}
        <path d="M6 46 L62 50 L66 76 L14 92 Q6 94 6 86 Z" fill={`url(#${id}-wood)`} {...outline} />
        <path d="M6 46 L14 46 L18 90 L6 92 Z" fill="#2b3038" stroke="#000" />
        <path d="M20 54 L58 56 M18 66 L60 66 M16 78 L56 74" stroke="#7a4616" strokeWidth="1" opacity="0.7" />
        {/* receiver */}
        <path d="M60 44 L150 44 L150 78 L60 78 Z" fill={`url(#${id}-dark)`} {...outline} />
        <rect x="60" y="40" width="92" height="8" rx="2" fill="#3a414b" stroke="#000" />
        {[70, 88, 106, 124, 142].map((x) => <circle key={x} cx={x} cy="60" r="1.8" fill="#8a929e" />)}
        {/* selector lever */}
        <path d="M100 52 L138 56 L138 60 L100 58 Z" fill="#8a929e" stroke="#000" strokeWidth="1" />
        {/* rear sight */}
        <path d="M150 40 L166 40 L164 48 L150 48 Z" fill="#2b3038" stroke="#000" />
        <rect x="156" y="34" width="6" height="7" fill="#1c2026" stroke="#000" />
        {/* pistol grip */}
        <path d="M94 78 L116 78 L108 118 Q106 124 100 124 L88 124 Q84 124 85 118 Z" fill={`url(#${id}-woodDark)`} {...outline} />
        <path d="M92 86 L110 86 M91 94 L108 94 M90 102 L106 102 M89 110 L104 110" stroke="#2e1808" strokeWidth="1.5" />
        {/* trigger guard + trigger */}
        <path d="M118 78 Q112 100 128 102 L146 102 Q152 102 150 94 L146 80" fill="none" stroke="#1c2026" strokeWidth="5" strokeLinecap="round" />
        <path d="M136 82 Q130 92 134 100" stroke="#c3cad4" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        {/* magazine (banana) */}
        <path d="M122 78 L158 78 Q166 96 166 116 Q166 134 152 138 Q140 140 128 126 Q118 108 122 78 Z" fill="#c9742b" {...outline} />
        <path d="M128 82 L152 82 Q158 100 158 116 Q158 126 150 130" fill="none" stroke="#f0a65a" strokeWidth="2" opacity="0.8" />
        <path d="M130 92 Q142 96 152 92 M132 104 Q144 108 156 104 M134 116 Q146 120 156 116" stroke="#7a3c0e" strokeWidth="1.6" fill="none" />
        {/* handguard */}
        <path d="M150 50 L198 50 L200 74 L150 76 Z" fill={`url(#${id}-wood)`} {...outline} />
        <path d="M156 56 L196 56 M156 64 L196 64" stroke="#7a4616" strokeWidth="1.2" opacity="0.7" />
        {/* gas tube */}
        <path d="M152 40 L204 42 L206 50 L152 50 Z" fill={`url(#${id}-dark)`} {...outline} />
        <path d="M166 44 L200 44" stroke="#8a929e" strokeWidth="1" />
        {/* barrel */}
        <path d="M200 54 L250 56 L250 64 L200 66 Z" fill={`url(#${id}-dark)`} {...outline} />
        {/* front sight */}
        <path d="M212 54 L222 54 L220 40 L214 40 Z" fill="#2b3038" stroke="#000" />
        <rect x="216" y="30" width="3" height="11" fill="#1c2026" stroke="#000" strokeWidth="0.8" />
        {/* gas block */}
        <rect x="200" y="42" width="12" height="14" rx="1" fill="#2b3038" stroke="#000" />
        {/* muzzle brake */}
        <path d="M244 50 L258 48 L258 70 L244 68 Z" fill="#2b3038" {...outline} />
        <circle cx="256" cy="59" r="2.6" fill="#000" />
        {/* cleaning rod */}
        <path d="M200 70 L246 70" stroke="#8a929e" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function NailGun({ id = 'n' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(10 6)">
        {/* nail strip magazine (angled) */}
        <path d="M176 70 L196 86 L114 140 L94 124 Z" fill={`url(#${id}-dark)`} {...outline} />
        <path d="M180 78 L188 84 L116 132 L108 126 Z" fill="#9aa3ae" />
        {Array.from({ length: 14 }).map((_, i) => {
          const k = i / 13;
          const x = 184 - k * 72, y = 80 + k * 48;
          return <path key={i} d={`M${x} ${y} l-6 8`} stroke="#e9edf2" strokeWidth="1.3" />;
        })}
        {/* handle */}
        <path d="M86 70 L120 70 L92 134 Q88 142 80 142 L62 142 Q54 142 58 132 Z" fill="#1c2026" {...outline} />
        <path d="M90 82 L112 82 L88 130 L68 130 Z" fill={`url(#${id}-gripRubber)`} stroke="#000" />
        {/* air fitting */}
        <rect x="56" y="140" width="34" height="8" rx="2" fill="#8a929e" stroke="#000" />
        <circle cx="62" cy="149" r="4" fill="#c3cad4" stroke="#000" />
        {/* trigger */}
        <path d="M124 78 Q118 90 124 100" stroke="#c3cad4" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M120 72 Q110 104 130 106" fill="none" stroke="#1c2026" strokeWidth="4" strokeLinecap="round" />
        {/* main body */}
        <path d="M60 30 Q60 18 72 18 L176 18 Q190 18 190 32 L190 60 Q190 72 178 72 L72 72 Q60 72 60 60 Z" fill={`url(#${id}-yellow)`} {...outline} />
        <path d="M66 24 L170 24" stroke="#fff4b0" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        <path d="M62 60 L188 60 L188 66 Q188 70 180 70 L72 70 Q62 70 62 62 Z" fill="#000" opacity="0.18" />
        {/* cylinder head */}
        <path d="M100 18 Q100 4 118 4 L162 4 Q180 4 180 18 Z" fill="#1c2026" {...outline} />
        <path d="M108 12 L172 12" stroke="#5c636e" strokeWidth="2" />
        {/* black stripe + vents */}
        <path d="M60 40 L190 40 L190 50 L60 50 Z" fill="#15181d" />
        {[70, 80, 90, 100].map((x) => <rect key={x} x={x} y="42" width="5" height="6" fill="#4a515c" />)}
        {/* depth dial */}
        <circle cx="150" cy="45" r="9" fill="#2b3038" stroke="#000" />
        <circle cx="150" cy="45" r="5" fill="#f5b400" stroke="#000" />
        <path d="M150 40 L150 50" stroke="#000" strokeWidth="1.4" />
        {/* exhaust */}
        <rect x="164" y="26" width="18" height="10" rx="2" fill="#2b3038" stroke="#000" />
        {/* nose / driver */}
        <path d="M190 36 L226 42 L226 62 L190 66 Z" fill={`url(#${id}-dark)`} {...outline} />
        <path d="M226 46 L246 48 L246 58 L226 60 Z" fill={`url(#${id}-steel)`} {...outline} />
        <path d="M244 46 L250 46 L250 60 L244 60 Z" fill="#1c2026" stroke="#000" />
        <path d="M196 40 L222 44" stroke="#8a929e" strokeWidth="1.5" />
        {/* safety tip */}
        <path d="M246 44 L254 44 L254 62 L246 62 Z" fill="#f5b400" stroke="#000" />
        {/* brand plate */}
        <rect x="108" y="54" width="36" height="5" rx="1" fill="#1c2026" />
        <rect x="112" y="55.5" width="28" height="2" fill="#f5b400" />
      </g>
    </svg>
  );
}

export function Crossbow({ id = 'c' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(0 4)">
        {/* strings (behind) */}
        <path d="M232 18 L126 72 L232 128" fill="none" stroke="#e9edf2" strokeWidth="1.6" />
        <path d="M232 18 L126 72 L232 128" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.5" />
        {/* stock */}
        <path d="M8 86 L40 72 L120 70 L200 68 L200 82 L120 84 L62 88 L48 116 Q44 122 36 120 L14 112 Q6 110 8 100 Z" fill={`url(#${id}-wood)`} {...outline} />
        <path d="M14 92 L56 82 M16 102 L50 96" stroke="#7a4616" strokeWidth="1.2" opacity="0.7" />
        <path d="M8 86 L16 84 L18 112 L10 110 Z" fill="#2b3038" stroke="#000" />
        {/* fore grip */}
        <path d="M140 84 L166 84 L162 104 Q160 110 154 110 L148 110 Q142 110 142 104 Z" fill={`url(#${id}-woodDark)`} {...outline} />
        {/* trigger guard + trigger */}
        <path d="M70 88 Q66 106 82 108 L100 108 Q106 108 104 100 L100 88" fill="none" stroke="#1c2026" strokeWidth="5" strokeLinecap="round" />
        <path d="M86 90 Q82 98 86 104" stroke="#c3cad4" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        {/* rail */}
        <path d="M60 62 L206 60 L206 70 L60 72 Z" fill={`url(#${id}-dark)`} {...outline} />
        {[80, 100, 120, 140, 160, 180].map((x) => <rect key={x} x={x} y="63" width="8" height="6" fill="#3a414b" />)}
        {/* latch / trigger box */}
        <rect x="110" y="58" width="28" height="18" rx="3" fill="#2b3038" {...outline} />
        <circle cx="124" cy="67" r="3" fill="#8a929e" stroke="#000" />
        {/* scope */}
        <rect x="76" y="46" width="60" height="14" rx="7" fill={`url(#${id}-dark)`} {...outline} />
        <rect x="90" y="56" width="6" height="8" fill="#1c2026" />
        <rect x="116" y="56" width="6" height="8" fill="#1c2026" />
        <ellipse cx="136" cy="53" rx="3" ry="6" fill="#2a4a6a" stroke="#000" />
        <ellipse cx="76" cy="53" rx="3" ry="6" fill="#1a1e24" stroke="#000" />
        {/* riser */}
        <path d="M200 56 L226 58 L228 86 L200 84 Z" fill={`url(#${id}-dark)`} {...outline} />
        <circle cx="214" cy="71" r="4" fill="#8a929e" stroke="#000" />
        {/* limbs */}
        <path d="M212 58 Q208 36 232 16 Q238 12 238 20 Q236 40 222 60 Z" fill={`url(#${id}-steel)`} {...outline} />
        <path d="M212 84 Q208 106 232 126 Q238 130 238 122 Q236 102 222 82 Z" fill={`url(#${id}-steel)`} {...outline} />
        <path d="M216 56 Q214 40 230 22" stroke="#fff" strokeWidth="1.5" opacity="0.6" fill="none" />
        <path d="M216 86 Q214 102 230 120" stroke="#fff" strokeWidth="1.5" opacity="0.6" fill="none" />
        {/* cams */}
        <circle cx="234" cy="18" r="5" fill="#2b3038" stroke="#000" />
        <circle cx="234" cy="128" r="5" fill="#2b3038" stroke="#000" />
        {/* stirrup */}
        <path d="M228 66 Q252 66 252 72 Q252 78 228 78" fill="none" stroke="#2b3038" strokeWidth="4" />
        <path d="M228 66 Q252 66 252 72 Q252 78 228 78" fill="none" stroke="#8a929e" strokeWidth="1.5" />
        {/* bolt */}
        <path d="M128 56 L236 56" stroke="#3a2a1a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M128 56 L236 56" stroke="#c99a5a" strokeWidth="1.5" />
        <path d="M236 52 L250 56 L236 60 Z" fill="#c3cad4" stroke="#000" strokeWidth="0.8" />
        <path d="M130 56 L138 48 L150 48 L142 56 Z" fill="#e5322d" stroke="#000" strokeWidth="0.6" />
        <path d="M130 56 L138 64 L150 64 L142 56 Z" fill="#f5b400" stroke="#000" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

export function PlasmaGun({ id = 'g' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(0 8)">
        {/* antenna / sensor */}
        <path d="M150 40 L166 20" stroke="#2b3038" strokeWidth="3" />
        <circle cx="168" cy="18" r="4" fill={`url(#${id}-green)`} filter={`url(#${id}-glowG)`} />
        {/* stock */}
        <path d="M8 56 L44 46 L50 84 L20 92 Q8 94 8 82 Z" fill={`url(#${id}-gun)`} {...outline} />
        <path d="M14 62 L40 56 M16 74 L42 70" stroke="#4fd1c5" strokeWidth="1" opacity="0.5" />
        {/* grip */}
        <path d="M84 84 L108 84 L100 124 Q98 130 92 130 L78 130 Q72 130 74 124 Z" fill={`url(#${id}-gun)`} {...outline} />
        <path d="M88 92 L104 92 L98 120 L80 120 Z" fill={`url(#${id}-gripRubber)`} stroke="#000" />
        {/* trigger guard */}
        <path d="M110 84 Q104 106 122 108 L138 108 Q144 108 142 100 L138 86" fill="none" stroke="#1c2330" strokeWidth="5" strokeLinecap="round" />
        <path d="M126 88 Q120 96 124 104" stroke="#7dff4a" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* main body (angular) */}
        <path d="M44 42 L176 36 L216 42 L236 52 L236 70 L212 84 L160 88 L50 86 Z" fill={`url(#${id}-gun)`} {...outline} />
        <path d="M48 46 L174 40 L214 46 L230 54 L48 60 Z" fill="#ffffff" opacity="0.08" />
        <path d="M50 80 L210 80 L212 84 L160 88 L50 86 Z" fill="#000" opacity="0.3" />
        {/* teal edge lights */}
        <path d="M52 50 L172 44 M52 70 L170 70" stroke="#4fd1c5" strokeWidth="1.2" opacity="0.7" />
        {/* plasma cells */}
        {[70, 104, 138].map((x, i) => (
          <g key={x}>
            <rect x={x} y="50" width="28" height="18" rx="6" fill="#06110a" stroke="#000" />
            <rect x={x + 3} y="53" width="22" height="12" rx="5" fill={`url(#${id}-green)`} filter={`url(#${id}-glowG)`} opacity={i === 1 ? 1 : 0.9} />
            <rect x={x + 6} y="55" width="10" height="3" rx="1.5" fill="#ffffff" opacity="0.7" />
          </g>
        ))}
        {/* top fin */}
        <path d="M120 36 L150 30 L172 36 Z" fill="#2b3038" stroke="#000" />
        {/* emitter */}
        <path d="M236 52 L256 56 L256 66 L236 70 Z" fill={`url(#${id}-dark)`} {...outline} />
        <circle cx="256" cy="61" r="4" fill={`url(#${id}-green)`} filter={`url(#${id}-glowG)`} />
        <path d="M226 46 L246 42 L252 48 L232 52 Z" fill="#2b3038" stroke="#000" />
        <path d="M226 76 L246 80 L252 74 L232 70 Z" fill="#2b3038" stroke="#000" />
        {/* side plate + screws */}
        <path d="M176 46 L210 50 L208 76 L176 78 Z" fill="#1c2330" stroke="#000" />
        {[182, 202].map((x) => <circle key={x} cx={x} cy="62" r="2" fill="#4a515c" stroke="#000" strokeWidth="0.6" />)}
        <path d="M184 56 L200 56 M184 68 L200 68" stroke="#4fd1c5" strokeWidth="1" opacity="0.6" />
      </g>
    </svg>
  );
}

export function LaserBeam({ id = 'l' }: { id?: string }) {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full">
      <Defs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="translate(0 6)">
        {/* rear fin */}
        <path d="M18 50 L52 56 L50 84 L10 96 Q4 98 6 90 Z" fill={`url(#${id}-white)`} {...outline} />
        <path d="M14 66 L46 62" stroke="#ff6a8a" strokeWidth="2" opacity="0.8" />
        {/* grip */}
        <path d="M92 86 L116 86 L108 126 Q106 132 100 132 L86 132 Q80 132 82 126 Z" fill="#2b3038" {...outline} />
        <path d="M96 94 L112 94 L106 122 L88 122 Z" fill={`url(#${id}-gripRubber)`} stroke="#000" />
        {/* trigger guard */}
        <path d="M118 86 Q112 108 130 110 L146 110 Q152 110 150 102 L146 88" fill="none" stroke="#2b3038" strokeWidth="5" strokeLinecap="round" />
        <path d="M134 90 Q128 98 132 106" stroke="#ff3b3b" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* body: sleek white */}
        <path d="M48 46 Q60 36 90 36 L196 40 Q214 42 220 52 L220 76 Q214 86 196 86 L52 86 Q44 86 44 76 Z" fill={`url(#${id}-white)`} {...outline} />
        <path d="M56 44 Q66 40 90 40 L194 44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <path d="M48 76 L218 76 L218 80 Q212 84 196 84 L52 84 Z" fill="#8a93a8" opacity="0.6" />
        {/* pink racing stripe */}
        <path d="M60 64 L210 64 L210 70 L60 70 Z" fill="#ff6a8a" opacity="0.85" />
        <path d="M60 60 L210 60" stroke="#ff2a6a" strokeWidth="1.5" />
        {/* red coil fins */}
        {[100, 124, 148, 172].map((x) => (
          <g key={x}>
            <path d={`M${x} 40 L${x + 10} 24 L${x + 20} 40 Z`} fill="#1c2026" stroke="#000" />
            <rect x={x + 4} y="44" width="12" height="18" rx="3" fill="#06060a" stroke="#000" />
            <rect x={x + 6} y="46" width="8" height="14" rx="2" fill={`url(#${id}-red)`} filter={`url(#${id}-glowR)`} />
          </g>
        ))}
        {/* core window */}
        <rect x="64" y="46" width="30" height="12" rx="4" fill="#06060a" stroke="#000" />
        <rect x="67" y="48" width="24" height="8" rx="3" fill={`url(#${id}-red)`} filter={`url(#${id}-glowR)`} />
        {/* emitter nozzle */}
        <path d="M220 50 L244 54 L244 74 L220 78 Z" fill="#2b3038" {...outline} />
        <path d="M244 56 L256 58 L256 70 L244 72 Z" fill="#1c2026" stroke="#000" />
        <circle cx="256" cy="64" r="4.5" fill={`url(#${id}-red)`} filter={`url(#${id}-glowR)`} />
        <path d="M222 54 L240 56 M222 74 L240 72" stroke="#ff6a8a" strokeWidth="1.2" />
        {/* under-barrel lens rail */}
        <path d="M150 86 L214 86 L214 92 L150 92 Z" fill="#2b3038" stroke="#000" />
        <circle cx="206" cy="89" r="2" fill="#ff3b3b" filter={`url(#${id}-glowR)`} />
      </g>
    </svg>
  );
}

export const ARMORY: { id: ArmoryId; name: string; rarity: 'UMUM' | 'RARE'; desc: string; Art: (p: { id?: string }) => ReactElement }[] = [
  { id: 'pistol', name: 'PISTOL', rarity: 'UMUM', desc: 'Semi-otomatis 9mm. Ringan, akurat, cepat dikokang.', Art: Pistol },
  { id: 'ak47', name: 'AK-47', rarity: 'UMUM', desc: 'Senapan serbu legendaris. Kayu, baja, dan magasin pisang.', Art: AK47 },
  { id: 'nailgun', name: 'NAIL GUN', rarity: 'UMUM', desc: 'Pneumatik industri. Menembakkan paku baja bertekanan tinggi.', Art: NailGun },
  { id: 'crossbow', name: 'CROSSBOW', rarity: 'UMUM', desc: 'Busur silang compound dengan teleskop dan anak panah bersirip.', Art: Crossbow },
  { id: 'plasma', name: 'PLASMA GUN', rarity: 'RARE', desc: 'Tiga sel plasma hijau. Panas, bersuara rendah, mematikan.', Art: PlasmaGun },
  { id: 'laser', name: 'LASER BEAM', rarity: 'RARE', desc: 'Kumparan merah memfokuskan sinar koheren menembus apa pun.', Art: LaserBeam },
];
