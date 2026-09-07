/**
 * Global confirmation bottom-sheet for destructive actions, replacing window.confirm().
 * Forms opt in with `data-confirm-delete` (+ optional `data-confirm-message`) — see
 * the delegated submit handler in layout.tsx.
 */
export function ConfirmSheet() {
  return (
    <div id='confirm-sheet' class='fixed inset-0 z-[68] hidden' aria-hidden='true' role='alertdialog' aria-modal='true'>
      <div class='absolute inset-0 bg-black/40' data-confirm-backdrop></div>
      <div class='absolute bottom-0 left-0 right-0 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up p-5'>
        <div class='flex items-start gap-3 mb-5'>
          <span class='shrink-0 w-10 h-10 rounded-full bg-error-light text-error flex items-center justify-center'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>
          </span>
          <p class='text-base font-semibold text-slate-900 pt-1.5' data-confirm-message>Wirklich löschen?</p>
        </div>
        <div class='flex flex-col sm:flex-row-reverse gap-2'>
          <button type='button' data-confirm-accept class='btn-danger w-full sm:w-auto'>Löschen</button>
          <button type='button' data-confirm-close class='btn-secondary w-full sm:w-auto'>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
