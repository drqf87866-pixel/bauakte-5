import type { User } from '../db/schema';
import { Alert } from '../components/ui/alert';
import { DesktopNav } from '../components/layout/nav-desktop';
import { MobileNav } from '../components/layout/nav-mobile';
import { ControlCenter } from '../components/layout/control-center';
import { QuickUploadSheet } from '../components/layout/quick-upload-sheet';
import { ConfirmSheet } from '../components/layout/confirm-sheet';
import { Lightbox } from '../components/layout/lightbox';
import type { NavActive } from '../components/layout/nav-types';

export type { NavActive };

const FLASH_MESSAGES: Record<string, string> = {
  'uploaded': 'Dokument wurde erfolgreich hochgeladen.',
  'deleted': 'Dokument wurde gelöscht.',
  'retagged': 'KI-Analyse wurde erneut durchgeführt.',
  'retag-failed': 'KI-Analyse ist erneut fehlgeschlagen.',
  'retag-not-image': 'Nur Bilder können analysiert werden.',
  'phase-completed': 'Phase wurde abgeschlossen.',
  'phase-reopened': 'Phase wurde wieder geöffnet.',
  'phase-note-saved': 'Phasen-Notiz wurde gespeichert.',
  'project-created': 'Projekt wurde angelegt.',
  'project-deleted': 'Projekt wurde gelöscht.',
  'link-created': 'Einladungslink wurde erstellt.',
  'link-deactivated': 'Einladungslink wurde deaktiviert.',
  'notes-saved': 'Notiz wurde gespeichert.',
  'tags-saved': 'Tags wurden gespeichert.',
  'batch-analyzed': 'KI-Analyse für ausstehende Bilder wurde gestartet – Fortschritt wird automatisch aktualisiert.',
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
        <meta name='theme-color' content='#b5502e' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='black-translucent' />
        <meta name='apple-mobile-web-app-title' content='Bauakte' />
        <title>{title ? `${title} - Bauakte`: 'Bauakte'}</title>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='' />
        <link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap' />
        <link rel='stylesheet' href='/app.css' />
        <link rel='manifest' href='/manifest.json' />
        <link rel='apple-touch-icon' href='/icons/apple-icon-180.png' />
        <link rel='apple-touch-icon' sizes='152x152' href='/icons/apple-icon-152.png' />
        <link rel='apple-touch-icon' sizes='180x180' href='/icons/apple-icon-180.png' />
        <link rel='icon' type='image/svg+xml' href='/icons/icon.svg' />
        <script dangerouslySetInnerHTML={{ __html: `
          function openOverlay(el) { el.classList.remove('hidden'); el.setAttribute('aria-hidden', 'false'); }
          function closeOverlay(el) { el.classList.add('hidden'); el.setAttribute('aria-hidden', 'true'); }

          // Confirm destructive actions via bottom sheet (forms with data-confirm-delete)
          // instead of the blocking, unstyleable window.confirm().
          var pendingConfirmForm = null;
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.hasAttribute || !form.hasAttribute('data-confirm-delete')) return;
            if (form.dataset.confirmed === '1') return;
            e.preventDefault();
            var sheet = document.getElementById('confirm-sheet');
            var msg = form.getAttribute('data-confirm-message') ||
              'Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.';
            if (!sheet) {
              if (window.confirm(msg)) { form.dataset.confirmed = '1'; form.requestSubmit ? form.requestSubmit() : form.submit(); }
              return;
            }
            pendingConfirmForm = form;
            var msgEl = sheet.querySelector('[data-confirm-message]');
            if (msgEl) msgEl.textContent = msg;
            openOverlay(sheet);
          });
          document.addEventListener('click', function(e) {
            var sheet = document.getElementById('confirm-sheet');
            if (!sheet || sheet.classList.contains('hidden')) return;
            if (e.target.closest('[data-confirm-accept]')) {
              closeOverlay(sheet);
              var f = pendingConfirmForm;
              pendingConfirmForm = null;
              if (f) { f.dataset.confirmed = '1'; f.requestSubmit ? f.requestSubmit() : f.submit(); }
              return;
            }
            if (e.target.closest('[data-confirm-close]') || e.target.closest('[data-confirm-backdrop]')) {
              closeOverlay(sheet);
              pendingConfirmForm = null;
            }
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

          // Forms marked data-ajax-form (currently just Schnell-Upload) submit via XHR instead
          // of a full page POST: shows a real progress bar and, on success, navigates straight
          // to the resulting page - no intermediate /upload-quick page flash.
          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || !form.hasAttribute || !form.hasAttribute('data-ajax-form')) return;
            e.preventDefault();
            var progress = form.querySelector('[data-upload-progress]');
            var fill = form.querySelector('[data-upload-progress-fill]');
            var label = form.querySelector('[data-upload-progress-label]');
            if (progress) progress.hidden = false;

            var xhr = new XMLHttpRequest();
            xhr.open('POST', form.action, true);
            xhr.upload.addEventListener('progress', function(ev) {
              if (!ev.lengthComputable) return;
              var pct = Math.round((ev.loaded / ev.total) * 100);
              if (fill) fill.style.width = pct + '%';
              if (label) label.textContent = pct < 100 ? ('Wird hochgeladen\u2026 ' + pct + '%') : 'Wird verarbeitet\u2026';
            });
            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 400) {
                window.location.assign(xhr.responseURL || form.action);
              } else {
                resetAjaxForm(form, progress);
                if (label) label.textContent = 'Upload fehlgeschlagen - bitte erneut versuchen.';
              }
            };
            xhr.onerror = function() {
              resetAjaxForm(form, progress);
              if (label) label.textContent = 'Upload fehlgeschlagen - bitte erneut versuchen.';
            };
            xhr.send(new FormData(form));
          });
          function resetAjaxForm(form, progress) {
            var btn = form.querySelector('button[type="submit"]');
            if (btn) {
              btn.disabled = false;
              btn.classList.remove('opacity-60', 'cursor-wait');
              if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
            }
            if (progress) progress.hidden = true;
          }

          // Image error fallback (data-img-fallback)
          document.addEventListener('error', function(e) {
            var img = e.target;
            if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-img-fallback')) return;
            img.style.display = 'none';
            var placeholder = document.createElement('div');
            placeholder.className = 'w-full h-32 sm:h-48 bg-stone-200 flex items-center justify-center text-stone-400';
            placeholder.innerHTML = '<svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            img.parentNode.insertBefore(placeholder, img.nextSibling);
          });

          // data-file-input-group: generic filename display for any file input (works for
          // both server-rendered forms and forms injected later, e.g. the quick-upload sheet).
          document.addEventListener('change', function(e) {
            var input = e.target;
            if (!input || input.type !== 'file') return;
            var group = input.closest('[data-file-input-group]');
            var out = group && group.querySelector('[data-file-name-for]');
            if (out) out.textContent = input.files && input.files[0] ? input.files[0].name : '';
          });

          // Schnell-Upload: filter the phase <select> down to the chosen project's phases
          // (previously showed every phase of every project at once).
          document.addEventListener('change', function(e) {
            var sel = e.target;
            if (!sel || !sel.matches || !sel.matches('[data-qu-project]')) return;
            var form = sel.closest('form');
            var phaseSelect = form && form.querySelector('[data-qu-phase]');
            if (!phaseSelect) return;
            var projectId = sel.value;
            var stillValid = false;
            phaseSelect.querySelectorAll('option[data-project]').forEach(function(opt) {
              var matches = opt.getAttribute('data-project') === projectId;
              opt.hidden = projectId ? !matches : false;
              if (opt.selected && matches) stillValid = true;
            });
            if (!stillValid) phaseSelect.value = '';
          });

          // Quick-upload bottom sheet: opens instantly, form fragment loaded on demand.
          document.addEventListener('click', function(e) {
            var sheet = document.getElementById('quick-upload-sheet');
            if (!sheet) return;
            var trigger = e.target.closest('[data-quick-upload-trigger]');
            if (trigger) {
              // Already on the full /upload-quick page: let the link behave normally instead of
              // opening the sheet on top of it (avoids duplicate form element ids on one page).
              if (location.pathname === '/upload-quick' || location.pathname === '/upload-quick/') return;
              e.preventDefault();
              openOverlay(sheet);
              loadQuickUploadForm();
              return;
            }
            if (sheet.classList.contains('hidden')) return;
            if (e.target.closest('[data-qu-close]')) closeOverlay(sheet);
          });
          function loadQuickUploadForm() {
            var body = document.getElementById('quick-upload-sheet-body');
            if (!body) return;
            body.innerHTML = '<div class="flex items-center justify-center py-10 text-stone-400"><svg class="animate-spin shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>';
            // Pre-select project + phase when exactly one phase is focused in the "Dokumente"
            // view (path /projects/{id}/documents with a single ?phases=<id>). The server
            // validates the pair, so an invalid/mismatched combination is simply ignored.
            var ctx = '';
            var urlMatch = location.pathname.match(new RegExp('^/projects/([^/]+)/documents'));
            if (urlMatch) {
              var phasesParam = new URLSearchParams(location.search).get('phases');
              if (phasesParam && phasesParam.indexOf(',') === -1) {
                ctx = '&project=' + encodeURIComponent(urlMatch[1]) + '&phase=' + encodeURIComponent(phasesParam);
              }
            }
            fetch('/upload-quick?fragment=1' + ctx)
              .then(function(res) { return res.text(); })
              .then(function(html) { body.innerHTML = html; })
              .catch(function() {
                body.innerHTML = '<p class="text-sm text-error font-medium text-center py-6">Formular konnte nicht geladen werden. <a href="/upload-quick" class="underline">Seite öffnen</a></p>';
              });
          }

          // Lightbox: in-app image viewer for any [data-lightbox] thumbnail inside a
          // .lightbox-group grid, with next/prev + swipe across that group's images.
          var lightboxItems = [];
          var lightboxIndex = 0;
          document.addEventListener('click', function(e) {
            var trigger = e.target.closest('[data-lightbox]');
            if (trigger) {
              e.preventDefault();
              var group = trigger.closest('.lightbox-group');
              lightboxItems = group ? Array.prototype.slice.call(group.querySelectorAll('[data-lightbox]')) : [trigger];
              lightboxIndex = lightboxItems.indexOf(trigger);
              showLightbox();
              return;
            }
            var lb = document.getElementById('lightbox');
            if (!lb || lb.classList.contains('hidden')) return;
            if (e.target.closest('[data-lightbox-close]') || e.target === lb) { closeLightboxEl(lb); return; }
            if (e.target.closest('[data-lightbox-prev]')) { lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length; showLightbox(); return; }
            if (e.target.closest('[data-lightbox-next]')) { lightboxIndex = (lightboxIndex + 1) % lightboxItems.length; showLightbox(); return; }
          });
          function showLightbox() {
            var lb = document.getElementById('lightbox');
            var img = document.getElementById('lightbox-img');
            var caption = document.getElementById('lightbox-caption');
            var el = lightboxItems[lightboxIndex];
            if (!lb || !img || !el) return;
            img.src = el.getAttribute('data-full-src') || el.getAttribute('href');
            img.alt = el.getAttribute('data-caption') || '';
            if (caption) caption.textContent = el.getAttribute('data-caption') || '';
            var multi = lightboxItems.length > 1;
            var prevBtn = lb.querySelector('[data-lightbox-prev]');
            var nextBtn = lb.querySelector('[data-lightbox-next]');
            if (prevBtn) prevBtn.hidden = !multi;
            if (nextBtn) nextBtn.hidden = !multi;
            lb.classList.remove('hidden');
            lb.classList.add('flex');
            lb.setAttribute('aria-hidden', 'false');
          }
          function closeLightboxEl(lb) {
            lb.classList.add('hidden');
            lb.classList.remove('flex');
            lb.setAttribute('aria-hidden', 'true');
          }
          (function() {
            var startX = null;
            document.addEventListener('touchstart', function(e) {
              var lb = document.getElementById('lightbox');
              startX = (lb && !lb.classList.contains('hidden')) ? e.touches[0].clientX : null;
            }, { passive: true });
            document.addEventListener('touchend', function(e) {
              if (startX === null) return;
              var dx = e.changedTouches[0].clientX - startX;
              startX = null;
              if (Math.abs(dx) < 40 || lightboxItems.length < 2) return;
              lightboxIndex = dx > 0
                ? (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length
                : (lightboxIndex + 1) % lightboxItems.length;
              showLightbox();
            }, { passive: true });
          })();

          // Copy-to-clipboard (share link) with toast feedback
          var toastTimer = null;
          function showToast(msg) {
            var toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.remove('hidden');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { toast.classList.add('hidden'); }, 2200);
          }
          document.addEventListener('click', function(e) {
            var input = e.target.closest('[data-copy-link]');
            if (!input) return;
            input.select();
            var done = function() { showToast('Link kopiert ✓'); };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(input.value).then(done).catch(function() {
                try { document.execCommand('copy'); done(); } catch (err) {}
              });
            } else {
              try { document.execCommand('copy'); done(); } catch (err) {}
            }
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

          // Escape closes whichever overlay is currently open
          document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            var cc = document.getElementById('control-center');
            if (cc && cc.getAttribute('aria-hidden') === 'false') { cc.classList.add('hidden'); cc.setAttribute('aria-hidden', 'true'); return; }
            var qu = document.getElementById('quick-upload-sheet');
            if (qu && !qu.classList.contains('hidden')) { closeOverlay(qu); return; }
            var cs = document.getElementById('confirm-sheet');
            if (cs && !cs.classList.contains('hidden')) { closeOverlay(cs); pendingConfirmForm = null; return; }
            var lb = document.getElementById('lightbox');
            if (lb && !lb.classList.contains('hidden')) { closeLightboxEl(lb); }
          });
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          var deferredPrompt = null;
          var swWaiting = null;

          // --- Service Worker Registration & Update Detection ---
          if ('serviceWorker' in navigator && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
              regs.forEach(function (reg) { reg.unregister(); });
            });
          } else if ('serviceWorker' in navigator) {
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
      <body class='bg-[#faf8f5] min-h-screen text-stone-800'>
        {/* PWA Install Banner (Android/Chrome) */}
        <div id='install-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-brand text-white px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            <span class='text-sm font-medium'>Bauakte als App installieren</span>
          </div>
          <div class='flex items-center gap-2'>
            <button id='install-btn' class='bg-white text-brand font-semibold px-4 py-1.5 rounded-xl text-sm cursor-pointer border-0 hover:bg-brand-light transition'>Installieren</button>
            <button onclick='dismissInstall()' class='text-white/80 hover:text-white cursor-pointer border-0 bg-transparent p-1' aria-label='Schließen'>
              <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
            </button>
          </div>
        </div>

        {/* PWA Install Banner (iOS) */}
        <div id='ios-install-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-stone-900 text-white px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            <span class='text-sm font-medium'>App installieren: Teilen <span class='inline-block px-1' aria-hidden='true'>⬆️</span> → „Zum Home-Bildschirm"</span>
          </div>
          <button onclick='dismissIosInstall()' class='text-white/80 hover:text-white cursor-pointer border-0 bg-transparent p-1 shrink-0' aria-label='Schließen'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
          </button>
        </div>

        {/* Update Banner */}
        <div id='update-banner' class='hidden fixed top-0 left-0 right-0 z-[70] bg-warning text-[#3a2c12] px-4 py-3 flex items-center justify-between shadow-lg' role='alert'>
          <div class='flex items-center gap-3'>
            <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='23 4 23 10 17 10'/><polyline points='1 20 1 14 7 14'/><path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'/></svg>
            <span class='text-sm font-medium'>Neue Version verfügbar</span>
          </div>
          <div class='flex items-center gap-2'>
            <button onclick='applyUpdate()' class='bg-stone-900 text-white font-semibold px-4 py-1.5 rounded-xl text-sm cursor-pointer border-0 hover:bg-stone-800 transition'>Aktualisieren</button>
            <button onclick='dismissUpdate()' class='text-[#3a2c12]/70 hover:text-[#3a2c12] cursor-pointer border-0 bg-transparent p-1' aria-label='Schließen'>
              <svg aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
            </button>
          </div>
        </div>

        {/* Desktop Top Navigation */}
        {user && <DesktopNav user={user} active={active} />}

        <main class='max-w-5xl mx-auto px-4 py-6 safe-bottom'>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {user && <MobileNav user={user} active={active} />}

        {/* Control Center Overlay */}
        {user && <ControlCenter user={user} />}

        {/* Global overlays: quick-upload sheet, delete-confirmation sheet, image lightbox */}
        {user && <QuickUploadSheet />}
        {user && <ConfirmSheet />}
        {user && <Lightbox />}

        {/* Toast (e.g. "Link kopiert") */}
        <div id='toast' class='hidden fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[95] bg-stone-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-fade-in' role='status' aria-live='polite'></div>
      </body>
    </html>
  );
}
