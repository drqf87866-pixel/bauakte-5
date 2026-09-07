import { jsx, Fragment } from 'hono/jsx';
import type { User } from '../db/schema';
import { getInitials, getAvatarStyle } from '../lib/avatar';

export type NavActive = 'projects' | 'upload-quick';

const FLASH_MESSAGES: Record<string, string> = {
  'uploaded': 'Dokument wurde erfolgreich hochgeladen.',
  'deleted': 'Dokument wurde gelöscht.',
  'phase-completed': 'Phase wurde abgeschlossen.',
  'project-created': 'Projekt wurde angelegt.',
  'project-deleted': 'Projekt wurde gelöscht.',
  'link-created': 'Einladungslink wurde erstellt.',
  'link-deactivated': 'Einladungslink wurde deaktiviert.',
  'no-file': 'Bitte wähle zuerst eine Datei aus.',
  'upload-failed': 'Upload fehlgeschlagen. Bitte versuche es erneut.',
  'missing-fields': 'Bitte Projekt, Bauphase und Datei angeben.',
  'password-changed': 'Passwort wurde erfolgreich geändert.',
};

export function Flash({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) {
    return (
      <div role='alert' class='bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4 font-medium text-base'>
        {FLASH_MESSAGES[error] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}
      </div>
    );
  }
  if (ok) {
    return (
      <div role='status' class='bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-4 font-medium text-base flex items-center gap-2'>
        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>
        {FLASH_MESSAGES[ok] || 'Erfolgreich gespeichert.'}
      </div>
    );
  }
  return null;
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a href={href}
      aria-current={active ? 'page' : undefined}
      class={'px-3 py-2 rounded-lg text-base font-semibold no-underline transition ' +
        (active
          ? 'bg-amber-50 text-amber-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')}>
      {label}
    </a>
  );
}

export function Layout({
  user, title, active, children,
}: {
  user?: User | null;
  title?: string;
  active?: NavActive;
  children: any;
}) {
  return (
    <html lang='de'>
      <head>
        <meta charset='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0, viewport-fit=cover' />
        <meta name='theme-color' content='#b91c1c' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='black-translucent' />
        <meta name='apple-mobile-web-app-title' content='Bauakte' />
        <title>{title ? `${title} - Bauakte`: 'Bauakte'}</title>
        <link rel='stylesheet' href='/app.css' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='apple-touch-icon' href='/icons/apple-icon-180.png' />
        <link rel='apple-touch-icon' sizes='152x152' href='/icons/apple-icon-152.png' />
        <link rel='apple-touch-icon' sizes='180x180' href='/icons/apple-icon-180.png' />
        <link rel='icon' type='image/svg+xml' href='/icons/icon.svg' />
        <script dangerouslySetInnerHTML={{ __html: `
          // Confirm destructive actions (forms with data-confirm-delete)
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.hasAttribute || !form.hasAttribute('data-confirm-delete')) return;
            var msg = form.getAttribute('data-confirm-message') ||
              'Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.';
            if (!window.confirm(msg)) e.preventDefault();
          });

          // Upload forms: disable submit button while uploading
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.hasAttribute || !form.hasAttribute('data-upload-form')) return;
            form.setAttribute('aria-busy', 'true');
            var btn = form.querySelector('button[type="submit"]');
            if (btn && !btn.disabled) {
              btn.disabled = true;
              btn.classList.add('opacity-60', 'cursor-wait');
              if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
              btn.textContent = btn.getAttribute('data-loading-text') || 'Wird hochgeladen…';
            }
          });

          // Image error fallback (data-img-fallback)
          document.addEventListener('error', function(e) {
            var img = e.target;
            if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-img-fallback')) return;
            img.style.display = 'none';
            var placeholder = document.createElement('div');
            placeholder.className = 'w-full h-32 sm:h-48 bg-slate-200 flex items-center justify-center text-slate-400';
            placeholder.innerHTML = '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            img.parentNode.insertBefore(placeholder, img.nextSibling);
          });

          // Control center toggle
          document.addEventListener('click', function(e) {
            var sheet = document.getElementById('control-center');
            if (!sheet) return;
            var toggleBtn = e.target.closest('[data-toggle-cc]');
            if (toggleBtn) {
              e.preventDefault();
              sheet.classList.remove('hidden');
              sheet.setAttribute('aria-hidden', 'false');
              return;
            }
            var isInside = e.target.closest('[data-cc-stop]');
            var isAction = e.target.closest('[data-cc-action]');
            var isClose = e.target.closest('[data-cc-close]');
            if (sheet.getAttribute('aria-hidden') === 'true') return;
            if (isInside && !isAction) return;
            sheet.classList.add('hidden');
            sheet.setAttribute('aria-hidden', 'true');
          });
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          // --- Service Worker Registration & Update Detection ---
          if ('serviceWorker' in navigator) {
            var swReg;
            var swWaiting = null;

            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                swReg = reg;
                if (reg.waiting) {
                  swWaiting = reg.waiting;
                  showUpdateBanner();
                }
                reg.addEventListener('updatefound', function() {
                  var installing = reg.installing;
                  if (installing) {
                    installing.addEventListener('statechange', function() {
                      if (this.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                          swWaiting = installing;
                          showUpdateBanner();
                        }
                      }
                    });
                  }
                });
              }).catch(function() {});
            });

            var updating = false;
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              if (updating) return;
              updating = true;
              window.location.reload();
            });
          }

          function showUpdateBanner() {
            var banner = document.getElementById('update-banner');
            if (banner) banner.classList.remove('hidden');
          }

          function applyUpdate() {
            if (swWaiting) {
              swWaiting.postMessage('SKIP_WAITING');
            }
          }

          // --- Install Prompt (Android/Chrome) ---
          var deferredPrompt = null;
          var installBanner = document.getElementById('install-banner');
          var installBtn = document.getElementById('install-btn');

          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            if (installBanner && !localStorage.getItem('pwa-install-dismissed')) {
              installBanner.classList.remove('hidden');
            }
          });

          if (installBtn) {
            installBtn.addEventListener('click', function() {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function() {
                  deferredPrompt = null;
                });
              }
            });
          }

          // --- iOS Install Hint ---
          var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          var isStandalone = window.matchMedia('(display-mode: standalone)').matches;
          var iosBanner = document.getElementById('ios-install-banner');

          if (isIOS && !isStandalone && iosBanner && !localStorage.getItem('pwa-ios-dismissed')) {
            iosBanner.classList.remove('hidden');
          }

          // Dismiss handlers
          function dismissInstall() {
            var banner = document.getElementById('install-banner');
            if (banner) banner.classList.add('hidden');
            localStorage.setItem('pwa-install-dismissed', '1');
          }

          function dismissIosInstall() {
            var banner = document.getElementById('ios-install-banner');
            if (banner) banner.classList.add('hidden');
            localStorage.setItem('pwa-ios-dismissed', '1');
          }

          function dismissUpdate() {
            var banner = document.getElementById('update-banner');
            if (banner) banner.classList.add('hidden');
          }
        `}} />
      </head>
      <body class='bg-slate-50 min-h-screen text-slate-800'>
        {/* PWA Install Banner (Android/Chrome) */}
        <div id='install-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            <span class='text-sm font-medium'>Bauakte als App installieren</span>
          </div>
          <div class='flex items-center gap-2'>
            <button id='install-btn' class='bg-white text-red-700 font-semibold px-4 py-1.5 rounded-lg text-sm cursor-pointer border-0 hover:bg-red-50 transition'>Installieren</button>
            <button onclick='dismissInstall()' class='text-white/80 hover:text-white cursor-pointer border-0 bg-transparent p-1' aria-label='Schließen'>
              <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
            </button>
          </div>
        </div>

        {/* PWA Install Banner (iOS) */}
        <div id='ios-install-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            <span class='text-sm font-medium'>App installieren: Teilen <span class='inline-block px-1' aria-hidden='true'>⬆️</span> → „Zum Home-Bildschirm"</span>
          </div>
          <button onclick='dismissIosInstall()' class='text-white/80 hover:text-white cursor-pointer border-0 bg-transparent p-1 shrink-0' aria-label='Schließen'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
          </button>
        </div>

        {/* Update Banner */}
        <div id='update-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-amber-500 text-slate-900 px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'/></svg>
            <span class='text-sm font-medium'>Neue Version verfügbar</span>
          </div>
          <div class='flex items-center gap-2'>
            <button onclick='applyUpdate()' class='bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-lg text-sm cursor-pointer border-0 hover:bg-slate-800 transition'>Aktualisieren</button>
            <button onclick='dismissUpdate()' class='text-slate-700 hover:text-slate-900 cursor-pointer border-0 bg-transparent p-1' aria-label='Schließen'>
              <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
            </button>
          </div>
        </div>

        {/* Desktop Top Navigation */}
        <nav class='hidden md:block bg-white shadow-sm border-b border-t-4 border-t-red-700 top-header' aria-label='Hauptnavigation'>
          <div class='max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4'>
            <div class='flex items-center gap-2'>
              <a href='/' class='text-xl font-bold text-slate-900 no-underline'>Bauakte</a>
              {user && (
                <div class='flex items-center gap-1 ml-4'>
                  <NavLink href='/projects' label='Projekte' active={active === 'projects'} />
                  <NavLink href='/upload-quick' label='Schnell-Upload' active={active === 'upload-quick'} />
                </div>
              )}
            </div>
            <div class='flex items-center gap-4'>
              {user && (
                <>
                  <button type='button' data-toggle-cc aria-label='Benutzermenü'
                    class='flex items-center gap-2 cursor-pointer bg-transparent border-0 hover:bg-slate-100 rounded-lg px-2 py-1 transition'>
                    <div class={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' + getAvatarStyle(user.name).bg + ' ' + getAvatarStyle(user.name).text}>
                      {getInitials(user.name)}
                    </div>
                    <span class='text-sm text-slate-600 font-medium'>{user.name}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        <main class='max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6'>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {user && (
          <nav class='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white bottom-nav border-t-4 border-t-red-700' aria-label='Hauptnavigation'>
            <div class='flex items-end justify-around px-2 pt-2'>
              <a href='/'
                aria-current={active === 'projects' ? 'page' : undefined}
                class={'flex flex-col items-center justify-center min-h-[48px] min-w-[48px] flex-1 py-2 no-underline transition ' +
                  (active === 'projects' ? 'text-amber-400' : 'text-slate-300 hover:text-white')}>
                <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
              </a>

              <a href='/upload-quick'
                aria-current={active === 'upload-quick' ? 'page' : undefined}
                aria-label='Schnell-Upload: Foto oder Dokument aufnehmen'
                class='flex flex-col items-center justify-center flex-1 -mt-6 no-underline group'>
                <span class='w-14 h-14 rounded-full bg-amber-500 text-slate-900 shadow-lg flex items-center justify-center group-hover:bg-amber-400 transition active:scale-95'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>
                </span>
              </a>

              <button type='button' data-toggle-cc aria-label='Benutzermenü'
                class='flex flex-col items-center justify-center min-h-[48px] min-w-[48px] flex-1 py-2 text-slate-300 hover:text-white transition cursor-pointer'>
                <div class={'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ' + getAvatarStyle(user.name).bg + ' ' + getAvatarStyle(user.name).text}>
                  {getInitials(user.name)}
                </div>
              </button>
            </div>
          </nav>
        )}

        {/* Control Center Overlay (mobile bottom sheet + desktop dropdown) */}
        {user && (
          <div id='control-center' class='fixed inset-0 z-[60] hidden' aria-hidden='true'>
            {/* Backdrop */}
            <div class='absolute inset-0 bg-black/40 md:bg-transparent' data-cc-close></div>

            {/* Desktop dropdown */}
            <div class='hidden md:block absolute top-header mt-2 right-4 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in' data-cc-stop>
              <div class='flex items-center gap-3 px-4 py-4 border-b border-slate-100'>
                <div class={'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' + getAvatarStyle(user.name).bg + ' ' + getAvatarStyle(user.name).text}>
                  {getInitials(user.name)}
                </div>
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
                    class='w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition text-red-600 font-medium text-sm'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' x2='9' y1='12' y2='12'/></svg>
                    Abmelden
                  </button>
                </form>
              </div>
            </div>

            {/* Mobile bottom sheet */}
            <div class='md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl animate-slide-up' data-cc-stop>
              <div class='flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100'>
                <div class={'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' + getAvatarStyle(user.name).bg + ' ' + getAvatarStyle(user.name).text}>
                  {getInitials(user.name)}
                </div>
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
                    class='w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition text-red-600 font-medium'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' x2='9' y1='12' y2='12'/></svg>
                    Abmelden
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
