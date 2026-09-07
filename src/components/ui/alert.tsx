import { jsx } from 'hono/jsx';

type AlertType = 'error' | 'success' | 'warning';

interface AlertProps {
  type: AlertType;
  children: any;
  class?: string;
}

const classMap: Record<AlertType, string> = {
  error: 'alert-error',
  success: 'alert-success',
  warning: 'alert-warning',
};

const icons: Record<AlertType, any> = {
  error: (
    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
      <circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/>
    </svg>
  ),
  success: (
    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
      <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>
    </svg>
  ),
  warning: (
    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
    </svg>
  ),
};

export function Alert({ type, children, class: extraClass = '' }: AlertProps) {
  if (!children) return null;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} class={`${classMap[type]} ${extraClass}`}>
      {icons[type]}
      <span>{children}</span>
    </div>
  );
}
