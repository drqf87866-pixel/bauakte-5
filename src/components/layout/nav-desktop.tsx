import type { User } from '../../db/schema';
import { UserAvatar } from './avatar';
import type { NavActive } from './nav-types';

interface NavLinkProps {
  href: string;
  label: string;
  active: boolean;
}

function NavLink({ href, label, active, quickUpload }: NavLinkProps & { quickUpload?: boolean }) {
  return (
    <a href={href}
      data-quick-upload-trigger={quickUpload ? true : undefined}
      aria-current={active ? 'page' : undefined}
      class={'px-3 py-2 rounded-xl text-base font-semibold no-underline transition ' +
        (active
          ? 'bg-brand-light text-brand-dark'
          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100')}>
      {label}
    </a>
  );
}

interface DesktopNavProps {
  user: User;
  active?: NavActive;
}

export function DesktopNav({ user, active }: DesktopNavProps) {
  return (
    <nav class='hidden md:block bg-white shadow-sm border-b border-t-4 border-t-brand top-header' aria-label='Hauptnavigation'>
      <div class='max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4'>
        <div class='flex items-center gap-2'>
          <a href='/' class='flex items-center gap-2 no-underline'>
            <span class='w-8 h-8 rounded-[9px] bg-brand flex items-center justify-center shrink-0'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 11 12 4l9 7'/><path d='M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9'/></svg>
            </span>
            <span class='text-xl font-bold text-stone-900' style='font-family: var(--font-display);'>Bauakte</span>
          </a>
          <div class='flex items-center gap-1 ml-4'>
            <NavLink href='/projects' label='Projekte' active={active === 'projects'} />
            <NavLink href='/upload-quick' label='Schnell-Upload' active={active === 'upload-quick'} quickUpload />
          </div>
        </div>
        <div class='flex items-center gap-4'>
          <button type='button' data-toggle-cc aria-label='Benutzermenü'
            class='flex items-center gap-2 cursor-pointer bg-transparent border-0 hover:bg-stone-100 rounded-xl px-2 py-1 transition'>
            <UserAvatar name={user.name} />
            <span class='text-sm text-stone-600 font-medium hidden sm:inline'>{user.name}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
