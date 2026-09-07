import type { Child } from 'hono/jsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  children: Child;
  class?: string;
  [key: string]: unknown;
}

const variantClasses: Record<ButtonVariant, string> = {
  'primary': 'btn-primary',
  'secondary': 'btn-secondary',
  'danger': 'btn-danger',
  'danger-outline': 'btn-danger-outline',
  'ghost': 'btn-ghost',
  'success': 'btn-primary bg-success hover:bg-[#3c6b48]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  children,
  class: extraClass = '',
  ...props
}: ButtonProps) {
  const baseClass = `${variantClasses[variant]} ${sizeClasses[size]} ${extraClass}`;

  if (href) {
    return (
      <a href={href} class={baseClass} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type='button' class={baseClass} disabled={loading} {...props}>
      {children}
    </button>
  );
}
