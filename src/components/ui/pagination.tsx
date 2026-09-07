import { jsx } from 'hono/jsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  class?: string;
}

export function Pagination({ currentPage, totalPages, baseUrl, class: extraClass = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageUrl = (page: number) => {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return baseUrl + sep + 'page=' + page;
  };

  return (
    <nav class={'flex items-center justify-center gap-2 mt-6 ' + extraClass} aria-label='Seitennavigation'>
      {currentPage > 1 && (
        <a href={pageUrl(currentPage - 1)}
          class='min-h-[48px] min-w-[48px] flex items-center justify-center bg-white border rounded-lg px-4 font-semibold text-slate-700 hover:bg-slate-50 transition no-underline'>
          &larr; Zur&uuml;ck
        </a>
      )}
      <span class='text-sm text-slate-600 font-medium px-4'>
        Seite {currentPage} von {totalPages}
      </span>
      {currentPage < totalPages && (
        <a href={pageUrl(currentPage + 1)}
          class='min-h-[48px] min-w-[48px] flex items-center justify-center bg-white border rounded-lg px-4 font-semibold text-slate-700 hover:bg-slate-50 transition no-underline'>
          Weiter &rarr;
        </a>
      )}
    </nav>
  );
}
