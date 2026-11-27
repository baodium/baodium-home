const BG: Record<string, string> = {
  "olive-oil": "#e3e7d3",
  "sea-salt": "#e4e9ed",
  honey: "#f3e5c8",
  rigatoni: "#f2e8da",
  "chili-crisp": "#f2ddd3",
  coffee: "#e9e0d5",
  sardines: "#dde8ec",
  sencha: "#e3ebdb",
};

function Lines({ x, y, w, color, rows = 3 }: { x: number; y: number; w: number; color: string; rows?: number }) {
  return (
    <g fill={color}>
      {Array.from({ length: rows }, (_, i) => (
        <rect key={i} x={x + (i === 0 ? 0 : w * 0.12)} y={y + i * 7} width={i === 0 ? w : w * 0.76} height={i === 0 ? 4 : 2.4} rx={1.2} />
      ))}
    </g>
  );
}

export function ProductArt({ sku, className }: { sku: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden="true">
      <rect width="200" height="200" fill={BG[sku] ?? "#eee"} />
      <ellipse cx="100" cy="176" rx="52" ry="6" fill="#000" opacity="0.08" />
      {sku === "olive-oil" ? (
        <g>
          <rect x="88" y="22" width="24" height="12" rx="2" fill="#b08a3c" />
          <rect x="91" y="32" width="18" height="34" rx="3" fill="#2f4a2a" />
          <path d="M91 62 Q76 74 76 92 L76 166 Q76 174 84 174 L116 174 Q124 174 124 166 L124 92 Q124 74 109 62 Z" fill="#2f4a2a" />
          <rect x="82" y="102" width="36" height="50" rx="2" fill="#f3ecd8" />
          <circle cx="100" cy="116" r="6" fill="#7c8c3c" />
          <Lines x={88} y={128} w={24} color="#2f4a2a" />
          <rect x="80" y="70" width="3" height="80" rx="1.5" fill="#fff" opacity="0.18" />
        </g>
      ) : null}
      {sku === "sea-salt" ? (
        <g>
          <rect x="60" y="82" width="80" height="90" rx="8" fill="#fbfbf8" stroke="#cfd6dc" />
          <rect x="56" y="70" width="88" height="18" rx="4" fill="#2c4f6e" />
          <rect x="60" y="112" width="80" height="34" fill="#2c4f6e" />
          <Lines x={76} y={121} w={48} color="#f4f1e8" />
          <path d="M70 166 l6 -9 l6 9 z M128 60 l5 -8 l5 8 z M140 168 l4 -6 l4 6 z" fill="#ffffff" stroke="#d5dbe0" />
        </g>
      ) : null}
      {sku === "honey" ? (
        <g>
          <rect x="66" y="60" width="68" height="18" rx="4" fill="#3a2a1a" />
          <rect x="62" y="74" width="76" height="98" rx="20" fill="#d9962b" />
          <rect x="70" y="84" width="8" height="70" rx="4" fill="#fff" opacity="0.25" />
          <circle cx="100" cy="126" r="24" fill="#f6efe0" />
          <Lines x={86} y={118} w={28} color="#7a4f16" />
        </g>
      ) : null}
      {sku === "rigatoni" ? (
        <g>
          <rect x="58" y="42" width="84" height="130" rx="3" fill="#c8462f" />
          <rect x="72" y="84" width="56" height="52" rx="3" fill="#f2d49b" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={76 + (i % 3) * 17} y={90 + Math.floor(i / 3) * 22} width="13" height="18" rx="5" fill="#e4b766" stroke="#c99a48" transform={`rotate(${i % 2 ? 12 : -10} ${82 + (i % 3) * 17} ${99 + Math.floor(i / 3) * 22})`} />
          ))}
          <Lines x={76} y={54} w={48} color="#f8ead9" />
          <Lines x={82} y={148} w={36} color="#f8ead9" rows={2} />
        </g>
      ) : null}
      {sku === "chili-crisp" ? (
        <g>
          <rect x="64" y="64" width="72" height="18" rx="3" fill="#1f1f1f" />
          <rect x="66" y="78" width="68" height="94" rx="10" fill="#8e2a1b" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle key={i} cx={74 + ((i * 23) % 54)} cy={86 + ((i * 17) % 18)} r="2.4" fill="#e0763c" />
          ))}
          <rect x="70" y="110" width="60" height="38" rx="2" fill="#f4e8d4" />
          <Lines x={78} y={119} w={44} color="#8e2a1b" />
        </g>
      ) : null}
      {sku === "coffee" ? (
        <g>
          <rect x="62" y="44" width="76" height="128" rx="6" fill="#2d2420" />
          <rect x="62" y="44" width="76" height="16" rx="4" fill="#1d1714" />
          <circle cx="100" cy="74" r="4" fill="#4a3d36" />
          <rect x="74" y="90" width="52" height="60" rx="2" fill="#e9dccb" />
          <Lines x={81} y={100} w={38} color="#2d2420" />
          <circle cx="100" cy="134" r="7" fill="none" stroke="#a0603a" strokeWidth="2" />
        </g>
      ) : null}
      {sku === "sardines" ? (
        <g>
          <rect x="34" y="68" width="132" height="78" rx="24" fill="#2f6f8f" />
          <rect x="46" y="80" width="108" height="54" rx="16" fill="#f1e9d6" />
          <path d="M70 107 Q96 88 126 107 Q96 126 70 107 Z" fill="#7a95a3" />
          <path d="M126 107 l14 -9 l0 18 z" fill="#7a95a3" />
          <circle cx="80" cy="104" r="2" fill="#1f3a48" />
          <circle cx="50" cy="107" r="8" fill="none" stroke="#c8d6dc" strokeWidth="3" />
        </g>
      ) : null}
      {sku === "sencha" ? (
        <g>
          <rect x="66" y="58" width="68" height="114" rx="8" fill="#5f7f45" />
          <rect x="63" y="50" width="74" height="22" rx="4" fill="#4a6536" />
          <rect x="66" y="102" width="68" height="38" fill="#f3efe2" />
          <path d="M92 112 Q100 104 108 112 Q100 122 92 112 Z" fill="#5f7f45" />
          <Lines x={80} y={126} w={40} color="#4a6536" rows={2} />
        </g>
      ) : null}
    </svg>
  );
}
