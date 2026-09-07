import { Fragment } from 'hono/jsx';

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
          {i > 0 && <span class='text-stone-400'>/</span>}
          {item.href ? (
            <a href={item.href} class='text-brand hover:underline font-semibold no-underline'>{item.label}</a>
          ) : (
            <span class='text-stone-700 font-semibold'>{item.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
