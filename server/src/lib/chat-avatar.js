const ACCENT_PALETTE = [
  "#2563EB",
  "#7C3AED",
  "#D97706",
  "#059669",
  "#DC2626",
  "#0891B2",
  "#4F46E5",
  "#BE185D",
  "#65A30D",
  "#EA580C",
];

const BACKDROP_PALETTE = [
  "#DBEAFE",
  "#EDE9FE",
  "#FEF3C7",
  "#D1FAE5",
  "#FEE2E2",
  "#CFFAFE",
  "#E0E7FF",
  "#FCE7F3",
  "#ECFCCB",
  "#FFEDD5",
];

function hashString(value) {
  return [...String(value || "agent")].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

function pick(values, seed) {
  return values[hashString(seed) % values.length];
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function glyphFromName(name) {
  const segments = String(name || "Agent")
    .split(/\s+/)
    .map((segment) => segment.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return segments
    .slice(0, 2)
    .map((segment) => segment[0] || "")
    .join("")
    .toUpperCase();
}

function familySeed(entry) {
  return entry.parentId || entry.id || "agent";
}

function buildSvg({ glyph, accent, backdrop, seed }) {
  const variant = hashString(seed);
  const orbitX = 58 + (variant % 18);
  const orbitY = 16 + ((variant >> 2) % 20);
  const orbitR = 8 + ((variant >> 4) % 8);
  const lowerX = 18 + ((variant >> 6) % 18);
  const lowerY = 60 + ((variant >> 8) % 16);
  const lowerR = 14 + ((variant >> 10) % 10);
  const sweepStart = 14 + ((variant >> 12) % 10);
  const sweepEnd = 62 + ((variant >> 14) % 14);
  const sweepHeight = 20 + ((variant >> 16) % 14);
  const inset = 10 + ((variant >> 18) % 8);
  const accentOpacity = 0.18 + ((variant % 4) * 0.04);
  const stripeOpacity = 0.24 + (((variant >> 5) % 4) * 0.05);
  const secondaryAccent = pick(ACCENT_PALETTE, `${seed}:secondary`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${escapeSvg(glyph)}">
      <rect width="96" height="96" rx="28" fill="${escapeSvg(backdrop)}" />
      <rect x="${inset}" y="${inset}" width="${96 - inset * 2}" height="18" rx="9" fill="${escapeSvg(secondaryAccent)}" opacity="${stripeOpacity.toFixed(2)}" />
      <circle cx="${orbitX}" cy="${orbitY}" r="${orbitR}" fill="${escapeSvg(accent)}" opacity="${accentOpacity.toFixed(2)}" />
      <circle cx="${lowerX}" cy="${lowerY}" r="${lowerR}" fill="${escapeSvg(secondaryAccent)}" opacity="0.16" />
      <path d="M${sweepStart} 24C30 ${sweepHeight} 56 10 ${sweepEnd} 22" stroke="${escapeSvg(accent)}" stroke-width="6" stroke-linecap="round" opacity="0.45" />
      <text x="48" y="58" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="${escapeSvg(accent)}">${escapeSvg(glyph)}</text>
    </svg>
  `.trim();

  return {
    svg,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

export function buildAgentAvatar(entry) {
  const avatarImagePath = entry.chatIdentity?.avatarImagePath || null;
  const avatarMode = avatarImagePath ? "image" : "generated-svg";
  const avatarSeed = entry.chatIdentity?.avatarSeed || entry.id;
  const avatarGlyph = entry.chatIdentity?.avatarGlyph || glyphFromName(entry.name);
  const avatarAccent =
    entry.chatIdentity?.avatarAccent || pick(ACCENT_PALETTE, familySeed(entry));
  const avatarBackdrop = pick(BACKDROP_PALETTE, `${familySeed(entry)}:backdrop`);
  const generated = buildSvg({
    glyph: avatarGlyph,
    accent: avatarAccent,
    backdrop: avatarBackdrop,
    seed: avatarSeed,
  });

  return {
    avatarMode,
    avatarSeed,
    avatarGlyph,
    avatarAccent,
    avatarImagePath,
    avatarUrl: avatarImagePath || generated.dataUri,
    avatarSvg: generated.svg,
  };
}

export default buildAgentAvatar;
