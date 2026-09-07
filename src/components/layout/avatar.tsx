const AVATAR_PALETTE = [
  { bg: 'bg-brand', text: 'text-white' },
  { bg: 'bg-stone-600', text: 'text-white' },
  { bg: 'bg-stone-500', text: 'text-white' },
  { bg: 'bg-emerald-700', text: 'text-white' },
  { bg: 'bg-sky-700', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
  { bg: 'bg-violet-600', text: 'text-white' },
  { bg: 'bg-teal-700', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' },
  { bg: 'bg-cyan-700', text: 'text-white' },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? (w[0] + w[1]).toUpperCase() : w[0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashColorIndex(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % AVATAR_PALETTE.length;
}

function getAvatarStyle(name: string) {
  return AVATAR_PALETTE[hashColorIndex(name)];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
  class?: string;
}

export function UserAvatar({ name, size = 'md', class: extraClass = '' }: AvatarProps) {
  const style = getAvatarStyle(name);
  const dims = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div class={`${dims} rounded-full flex items-center justify-center font-bold shrink-0 ${style.bg} ${style.text} ${extraClass}`}>
      {getInitials(name)}
    </div>
  );
}
