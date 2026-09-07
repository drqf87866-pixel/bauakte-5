import type { User } from '../../db/schema';
import { UserAvatar } from './avatar';

interface ControlCenterProps {
  user: User;
}

export function ControlCenter({ user }: ControlCenterProps) {
  return (
    <div id='control-center' class='fixed inset-0 z-[60] hidden' aria-hidden='true'>
      {/* Backdrop */}
      <div class='absolute inset-0 bg-black/40 md:bg-transparent' data-cc-close></div>

      {/* Desktop dropdown */}
      <div class='hidden md:block absolute top-header mt-2 right-4 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in' data-cc-stop>
        <div class='flex items-center gap-3 px-4 py-4 border-b border-slate-100'>
          <UserAvatar name={user.name} />
          <div class='min-w-0'>
            <div class='font-semibold text-slate-900 truncate'>{user.name}</div>
            <div class='text-sm text-slate-500 truncate'>{user.email}</div>
          </div>
        </div>
        <div class='p-2'>
          <a href='/account/password' data-cc-action
            class='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition text-slate-700 font-medium text-sm'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
            Passwort ändern
          </a>
          <form action='/logout' method='post' data-cc-action>
            <button type='submit'
              class='w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition text-error font-medium text-sm'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' x2='9' y1='12' y2='12'/></svg>
              Abmelden
            </button>
          </form>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div class='md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl animate-slide-up' data-cc-stop>
        <div class='flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100'>
          <UserAvatar name={user.name} />
          <div class='min-w-0'>
            <div class='font-semibold text-slate-900 truncate'>{user.name}</div>
            <div class='text-sm text-slate-500 truncate'>{user.email}</div>
          </div>
        </div>
        <div class='p-3 pb-6'>
          <a href='/account/password' data-cc-action
            class='flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-100 transition text-slate-700 font-medium'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
            Passwort ändern
          </a>
          <form action='/logout' method='post' class='mt-1' data-cc-action>
            <button type='submit'
              class='w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition text-error font-medium'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' x2='9' y1='12' y2='12'/></svg>
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
