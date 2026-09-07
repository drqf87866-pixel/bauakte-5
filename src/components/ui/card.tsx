import { jsx } from 'hono/jsx';

interface CardProps {
  children: any;
  class?: string;
  [key: string]: any;
}

export function Card({ children, class: extraClass = '', ...props }: CardProps) {
  return (
    <div class={`card ${extraClass}`} {...props}>
      {children}
    </div>
  );
}

export function InteractiveCard({ children, class: extraClass = '', ...props }: CardProps) {
  return (
    <a class={`card-interactive ${extraClass}`} {...props}>
      {children}
    </a>
  );
}
