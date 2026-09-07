import type { User } from '../../db/schema';
import { UserAvatar } from './avatar';
import type { NavActive } from './nav-types';

interface MobileNavProps {
  user: User;
  active?: NavActive;
}

export function MobileNav({ user, active }: MobileNavProps) {
  return (
    <nav class='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-stone-900 text-white bottom-nav border-t-[3px] border-t-brand rounded-t-[22px]' aria-label='Hauptnavigation'>
      <div class='flex items-end justify-around px-2 pt-2'>
        <a href='/projects'
          aria-current={active === 'projects' ? 'page' : undefined}
          aria-label='Projekte'
          class={'flex flex-col items-center justify-center min-h-[48px] min-w-[48px] flex-1 py-2 no-underline transition ' +
            (active === 'projects' ? 'text-brand-light' : 'text-stone-300 hover:text-white')}>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
        </a>

        <a href='/upload-quick' data-quick-upload-trigger
          aria-current={active === 'upload-quick' ? 'page' : undefined}
          aria-label='Schnell-Upload: Foto oder Dokument aufnehmen'
          class='flex flex-col items-center justify-center flex-1 -mt-7 no-underline group'>
          <span class='w-16 h-16 rounded-full bg-brand text-white shadow-lg flex items-center justify-center group-hover:bg-brand-dark transition active:scale-95 ring-4 ring-stone-50'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>
          </span>
        </a>

        <button type='button' data-toggle-cc aria-label='Benutzermenü'
          class='flex flex-col items-center justify-center min-h-[48px] min-w-[48px] flex-1 py-2 text-stone-300 hover:text-white transition cursor-pointer'>
          <UserAvatar name={user.name} size='sm' />
        </button>
      </div>
    </nav>
  );
}
