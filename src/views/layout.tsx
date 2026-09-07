import type { User } from '../db/schema';
import { Alert } from '../components/ui/alert';
import { DesktopNav } from '../components/layout/nav-desktop';
import { MobileNav } from '../components/layout/nav-mobile';
import { ControlCenter } from '../components/layout/control-center';
import type { NavActive } from '../components/layout/nav-types';

export type { NavActive };

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
    return <Alert type='error'>{FLASH_MESSAGES[error] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'}</Alert>;
  }
  if (ok) {
    return <Alert type='success'>{FLASH_MESSAGES[ok] || 'Erfolgreich gespeichert.'}</Alert>;
  }
  return null;
}

export function Layout({
  user, title, active, children,
}: {
  user?: User | null;
  title?: string;
  active?: NavActive;
  children: import('hono/jsx').Child;
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
              btn.textContent = btn.getAttribute('data-loading-text') || 'Wird hochgeladen\u2026';
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
          var deferredPrompt = null;
          var swWaiting = null;

          // --- Service Worker Registration & Update Detection ---
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
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
                var updating = false;
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (updating) return;
                  updating = true;
                  window.location.reload();
                });
              }).catch(function() {});
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
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            var banner = document.getElementById('install-banner');
            if (banner && !localStorage.getItem('pwa-install-dismissed')) {
              banner.classList.remove('hidden');
            }
          });

          // --- iOS Install Hint ---
          var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

          // --- PWA UI: wait for DOM before attaching listeners ---
          document.addEventListener('DOMContentLoaded', function() {
            var installBtn = document.getElementById('install-btn');
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

            var isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            var iosBanner = document.getElementById('ios-install-banner');
            if (isIOS && !isStandalone && iosBanner && !localStorage.getItem('pwa-ios-dismissed')) {
              iosBanner.classList.remove('hidden');
            }
          });

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
        <div id='install-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-brand text-white px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            <span class='text-sm font-medium'>Bauakte als App installieren</span>
          </div>
          <div class='flex items-center gap-2'>
            <button id='install-btn' class='bg-white text-brand font-semibold px-4 py-1.5 rounded-lg text-sm cursor-pointer border-0 hover:bg-red-50 transition'>Installieren</button>
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
        <div id='update-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-warning text-slate-900 px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
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
        {user && <DesktopNav user={user} active={active} />}

        <main class='max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6'>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {user && <MobileNav user={user} active={active} />}

        {/* Control Center Overlay */}
        {user && <ControlCenter user={user} />}
      </body>
    </html>
  );
}
