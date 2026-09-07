/**
 * Global bottom-sheet shell for the Schnell-Upload flow.
 * Rendered once in <Layout> for every logged-in page. The FAB / nav link opens it
 * in place (no page navigation) — its body is fetched on demand from
 * GET /upload-quick?fragment=1 (see layout.tsx script + routes/upload-quick.tsx).
 * Progressive enhancement: without JS the trigger is a plain link to the full
 * /upload-quick page, which renders the same form.
 */
export function QuickUploadSheet() {
  return (
    <div id='quick-upload-sheet' class='fixed inset-0 z-[65] hidden' aria-hidden='true' role='dialog' aria-modal='true' aria-label='Schnell-Upload'>
      <div class='absolute inset-0 bg-black/40' data-qu-close></div>
      <div class='absolute bottom-0 left-0 right-0 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[88vh] overflow-y-auto' data-qu-stop>
        <div class='flex items-center justify-between gap-2 px-5 pt-5 pb-3 border-b border-stone-100 sticky top-0 bg-white rounded-t-2xl'>
          <h2 class='text-lg font-bold text-stone-900 flex items-center gap-2'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>
            Schnell-Upload
          </h2>
          <button type='button' data-qu-close aria-label='Schließen'
            class='shrink-0 p-2 -mr-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer border-0 bg-transparent'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
          </button>
        </div>
        <div id='quick-upload-sheet-body' class='p-5'>
          <div class='flex items-center justify-center py-10 text-stone-400' data-qu-loading>
            <svg class='animate-spin shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
