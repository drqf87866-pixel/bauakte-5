/**
 * Global in-app image viewer, replacing target="_blank" links to the raw R2 file.
 * Any grid wrapped in `.lightbox-group` with `<a data-lightbox data-full-src="…">` thumbnails
 * (see project-documents.tsx) opens here instead — with next/prev + swipe between all images
 * in that group. See the delegated handlers in layout.tsx.
 */
export function Lightbox() {
  return (
    <div id='lightbox' class='fixed inset-0 z-[90] hidden bg-black/90 items-center justify-center' aria-hidden='true' role='dialog' aria-modal='true' aria-label='Bildansicht'>
      <button type='button' data-lightbox-close aria-label='Schließen'
        class='absolute top-3 right-3 sm:top-5 sm:right-5 z-10 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition cursor-pointer border-0'>
        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
      </button>
      <button type='button' data-lightbox-prev aria-label='Vorheriges Bild'
        class='absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition cursor-pointer border-0'>
        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
      </button>
      <img id='lightbox-img' class='max-h-[90vh] max-w-[92vw] object-contain select-none' alt='' />
      <button type='button' data-lightbox-next aria-label='Nächstes Bild'
        class='absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition cursor-pointer border-0'>
        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
      </button>
      <p id='lightbox-caption' class='absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90vw] truncate text-sm text-white/80 font-medium px-3'></p>
    </div>
  );
}
