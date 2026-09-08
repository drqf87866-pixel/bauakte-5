import type { Child } from 'hono/jsx';

type BadgeVariant = 'success' | 'default' | 'tag';

interface BadgeProps {
  variant: BadgeVariant;
  children: Child;
  class?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  default: 'bg-stone-200 text-stone-700 text-sm px-3 py-1.5 rounded-full font-semibold',
  tag: 'text-xs bg-accent-light text-[#8a6a1f] px-2.5 py-1 rounded-full font-semibold',
};

export function Badge({ variant, children, class: extraClass = '' }: BadgeProps) {
  return (
    <span class={`${variantClasses[variant]} ${extraClass}`}>
      {children}
    </span>
  );
}
