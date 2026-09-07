import { jsx } from 'hono/jsx';

type BadgeVariant = 'success' | 'progress' | 'default' | 'tag';

interface BadgeProps {
  variant: BadgeVariant;
  children: any;
  class?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  progress: 'badge-progress',
  default: 'bg-slate-200 text-slate-700 text-sm px-3 py-1.5 rounded-full font-bold',
  tag: 'text-xs bg-slate-800 text-white px-2 py-1 rounded-full font-semibold',
};

export function Badge({ variant, children, class: extraClass = '' }: BadgeProps) {
  return (
    <span class={`${variantClasses[variant]} ${extraClass}`}>
      {children}
    </span>
  );
}
