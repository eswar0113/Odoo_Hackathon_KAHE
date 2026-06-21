/* ─────────────────────────────────────────────────────────────────────────
   FurnitureScene — purely presentational.
   Parent is responsible for mouse tracking; pass tiltX / tiltY as props.
   ───────────────────────────────────────────────────────────────────────── */

function StatBadge({ label, value, icon, delay, posStyle, parallaxX, parallaxY, depth }) {
  return (
    /* outer div: parallax shift on mouse move */
    <div style={{
      position: 'absolute',
      transform: `translate(${(parallaxX || 0) * depth}px, ${(parallaxY || 0) * depth}px)`,
      transition: 'transform 0.22s ease-out',
      zIndex: 2,
      ...posStyle,
    }}>
      {/* inner div: independent float animation */}
      <div style={{
        animation: `sfloat 4s ${delay}s ease-in-out infinite`,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '152px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{
            color: 'rgba(255,255,255,0.42)',
            fontSize: '9.5px', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3,
          }}>{label}</div>
          <div style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: '12.5px', fontWeight: 700, letterSpacing: '-0.01em',
          }}>{value}</div>
        </div>
      </div>
    </div>
  )
}

function FurnitureSVG() {
  return (
    <svg
      viewBox="0 0 320 235"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 360, display: 'block' }}
    >
      {/* ── floor shadow ── */}
      <ellipse cx="160" cy="214" rx="128" ry="16" fill="rgba(0,0,0,0.20)" />

      {/* ═══════════════════════════════════════════════
          DINING TABLE  (isometric 3/4 view)
          ═══════════════════════════════════════════════ */}

      {/* back legs — drawn first so tabletop covers them */}
      <rect x="188" y="92" width="7" height="82" rx="2" fill="#3E2306" opacity="0.6" />
      <rect x="126" y="108" width="7" height="82" rx="2" fill="#3E2306" opacity="0.6" />

      {/* tabletop — right side face */}
      <polygon points="195,78 235,100 235,113 195,91" fill="#916019" />
      {/* tabletop — front face */}
      <polygon points="90,113 195,78 195,91 90,126" fill="#A87220" />
      {/* tabletop — top surface */}
      <polygon points="90,100 195,65 235,88 130,123" fill="#D4A04A" />

      {/* wood grain on top surface */}
      <line x1="108" y1="97"  x2="213" y2="62" stroke="#BF8C28" strokeWidth="1.2" opacity="0.32" strokeLinecap="round" />
      <line x1="128" y1="103" x2="233" y2="68" stroke="#BF8C28" strokeWidth="1.2" opacity="0.32" strokeLinecap="round" />
      <line x1="148" y1="109" x2="235" y2="78" stroke="#BF8C28" strokeWidth="1.2" opacity="0.32" strokeLinecap="round" />

      {/* front legs */}
      <rect x="93"  y="124" width="7" height="82" rx="2" fill="#6A3E0E" />
      <rect x="198" y="90"  width="7" height="82" rx="2" fill="#6A3E0E" />

      {/* ═══════════════════════════════════════════════
          CHAIR — LEFT
          ═══════════════════════════════════════════════ */}

      {/* back legs */}
      <line x1="36" y1="119" x2="34" y2="162" stroke="#3E1E06" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      {/* seat — right face */}
      <polygon points="38,122 66,108 66,117 38,131" fill="#7A4A12" />
      {/* seat — front face */}
      <polygon points="17,129 38,122 38,131 17,138" fill="#9A5E1A" />
      {/* seat — top */}
      <polygon points="17,122 38,115 66,102 45,109" fill="#C4842A" />
      {/* chair back — right face */}
      <polygon points="38,86  66,72  66,108 38,122" fill="#6A3A0E" />
      {/* chair back — front face */}
      <polygon points="17,92  38,86  38,122 17,129" fill="#8C521A" />
      {/* chair back — top face */}
      <polygon points="17,86  38,80  66,67  45,73"  fill="#A46C20" />
      {/* front legs */}
      <line x1="20" y1="138" x2="18" y2="174" stroke="#522A08" strokeWidth="4" strokeLinecap="round"/>
      <line x1="62" y1="117" x2="64" y2="160" stroke="#522A08" strokeWidth="4" strokeLinecap="round"/>

      {/* ═══════════════════════════════════════════════
          CHAIR — RIGHT
          ═══════════════════════════════════════════════ */}

      {/* back legs */}
      <line x1="254" y1="103" x2="256" y2="147" stroke="#3E1E06" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      {/* seat — right face */}
      <polygon points="258,88 286,74 286,83 258,97" fill="#7A4A12" />
      {/* seat — front face */}
      <polygon points="238,94 258,88 258,97 238,103" fill="#9A5E1A" />
      {/* seat — top */}
      <polygon points="238,88 258,82 286,69 265,75"  fill="#C4842A" />
      {/* chair back — right face */}
      <polygon points="258,52 286,38 286,74 258,88"  fill="#6A3A0E" />
      {/* chair back — front face */}
      <polygon points="238,58 258,52 258,88 238,94"  fill="#8C521A" />
      {/* chair back — top face */}
      <polygon points="238,52 258,46 286,33 265,39"  fill="#A46C20" />
      {/* front legs */}
      <line x1="240" y1="103" x2="238" y2="147" stroke="#522A08" strokeWidth="4" strokeLinecap="round"/>
      <line x1="282" y1="83"  x2="284" y2="125" stroke="#522A08" strokeWidth="4" strokeLinecap="round"/>

      {/* ═══════════════════════════════════════════════
          TABLE DÉCOR — vase + plant
          ═══════════════════════════════════════════════ */}
      <path d="M152,84 Q148,72 154,62 Q158,57 162,62 Q168,72 164,84 Z" fill="rgba(155,195,215,0.55)" />
      <ellipse cx="158" cy="84" rx="7" ry="3.2" fill="rgba(140,185,210,0.7)" />
      <ellipse cx="158" cy="56" rx="6"  ry="8"   fill="rgba(72,180,95,0.72)" />
      <ellipse cx="150" cy="62" rx="5"  ry="6"   fill="rgba(52,158,75,0.65)" transform="rotate(-26,150,62)" />
      <ellipse cx="166" cy="62" rx="5"  ry="6"   fill="rgba(52,158,75,0.65)" transform="rotate(26,166,62)" />

      {/* soft accent glow under scene */}
      <ellipse cx="160" cy="178" rx="88" ry="11" fill="rgba(180,83,9,0.06)" />
    </svg>
  )
}

/* ─── exported component ─────────────────────────────────────────────────── */
export default function FurnitureScene({ tiltX = 0, tiltY = 0, showBadges = true }) {
  return (
    <>
      <style>{`
        @keyframes sfloat {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-7px); }
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        perspective: '920px',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        {/* subtle dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065 }}>
          <defs>
            <pattern id="sc-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sc-dots)" />
        </svg>

        {/* ambient violet glow */}
        <div style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '310px', height: '310px',
          background: 'radial-gradient(circle, rgba(180,83,9,0.18) 0%, transparent 68%)',
        }} />

        {/* 3-D tilt wrapper — only rotates, does NOT use preserve-3d to avoid
            backdrop-filter conflicts with floating badges */}
        <div style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transition: 'transform 0.2s ease-out',
          position: 'relative',
          width: '360px',
        }}>
          <FurnitureSVG />

          {showBadges && (
            <>
              <StatBadge
                label="Oak Dining Table" value="₹45,000 · 12 in stock" icon="🪑"
                delay={0}   posStyle={{ top: '10px',  left: '-38px' }}
                parallaxX={tiltY} parallaxY={tiltX} depth={0.8}
              />
              <StatBadge
                label="Ergonomic Chair"  value="₹12,500 · 24 in stock" icon="🛋️"
                delay={1.3} posStyle={{ bottom: '38px', left: '-32px' }}
                parallaxX={tiltY} parallaxY={tiltX} depth={1.5}
              />
              <StatBadge
                label="Wooden Shelf"    value="₹22,000 · 8 in stock"  icon="🪵"
                delay={0.7} posStyle={{ top: '82px',  right: '-36px' }}
                parallaxX={tiltY} parallaxY={tiltX} depth={1.1}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
