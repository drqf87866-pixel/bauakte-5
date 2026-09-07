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
      class={'px-3 py-2 rounded-lg text-base font-semibold no-underline transition ' +
        (active
          ? 'bg-amber-50 text-amber-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')}>
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
          <a href='/' class='text-xl font-bold text-slate-900 no-underline'>Bauakte</a>
          <div class='flex items-center gap-1 ml-4'>
            <NavLink href='/projects' label='Projekte' active={active === 'projects'} />
            <NavLink href='/upload-quick' label='Schnell-Upload' active={active === 'upload-quick'} quickUpload />
          </div>
        </div>
        <div class='flex items-center gap-4'>
          <button type='button' data-toggle-cc aria-label='Benutzermenü'
            class='flex items-center gap-2 cursor-pointer bg-transparent border-0 hover:bg-slate-100 rounded-lg px-2 py-1 transition'>
            <UserAvatar name={user.name} />
            <span class='text-sm text-slate-600 font-medium hidden sm:inline'>{user.name}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
