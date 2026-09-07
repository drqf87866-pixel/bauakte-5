import { jsx, Fragment } from 'hono/jsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  class?: string;
}

export function Breadcrumb({ items, class: extraClass = '' }: BreadcrumbProps) {
  return (
    <div class={'breadcrumb ' + extraClass}>
      {items.map((item, i) => (
        <Fragment>
          {i > 0 && <span class='text-slate-400'>/</span>}
          {item.href ? (
            <a href={item.href} class='text-accent hover:underline font-semibold no-underline'>{item.label}</a>
          ) : (
            <span class='text-slate-700 font-bold'>{item.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
