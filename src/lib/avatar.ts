// Simple deterministic avatar helpers (no external deps)

const AVATAR_PALETTE = [
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-slate-600', text: 'text-white' },
  { bg: 'bg-stone-500', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-sky-600', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
] as const;

/** Extract initials from a name (e.g. "Max Mustermann" → "MM") */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? (w[0] + w[1]).toUpperCase() : w[0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic color index from a string */
function hashColorIndex(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % AVATAR_PALETTE.length;
}

/** Get Tailwind classes for the avatar background/text based on the user's name */
export function getAvatarStyle(name: string) {
  return AVATAR_PALETTE[hashColorIndex(name)];
}
