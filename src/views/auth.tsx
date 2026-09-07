import { jsx } from 'hono/jsx';
import { Layout } from './layout';

export function LoginPage({ error, redirect }: { error: string | null; redirect?: string }) {
  return (
    <Layout title='Anmelden'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-slate-900'>Anmelden</h1>
        {error && (
          <div class='bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4 font-medium text-base'>{error}</div>
        )}
        <form method='post' action='/login' class='space-y-4' aria-label='Anmeldeformular'>
          {redirect && <input type='hidden' name='redirect' value={redirect} />}
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='email'>E-Mail</label>
            <input type='email' name='email' id='email' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='password'>Passwort</label>
            <input type='password' name='password' id='password' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <button type='submit'
            class='w-full bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition text-base font-bold min-h-[48px]'>
            Anmelden
          </button>
        </form>
        <p class='mt-4 text-center text-base text-slate-600 font-medium'>
          Noch kein Konto?{' '}
          <a href='/register' class='text-amber-600 hover:underline font-semibold'>Registrieren</a>
        </p>
      </div>
    </Layout>
  );
}

export function RegisterPage({ error }: { error: string | null }) {
  return (
    <Layout title='Registrieren'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-slate-900'>Registrieren</h1>
        {error && (
          <div class='bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4 font-medium text-base'>{error}</div>
        )}
        <form method='post' action='/register' class='space-y-4' aria-label='Registrierungsformular'>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='name'>Name</label>
            <input type='text' name='name' id='name' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='email'>E-Mail</label>
            <input type='email' name='email' id='email' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='password'>Passwort</label>
            <input type='password' name='password' id='password' required minLength={8}
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
            <p class='text-xs text-slate-500 mt-1 font-medium'>Mindestens 8 Zeichen</p>
          </div>
          <button type='submit'
            class='w-full bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition text-base font-bold min-h-[48px]'>
            Registrieren
          </button>
        </form>
        <p class='mt-4 text-center text-base text-slate-600 font-medium'>
          Bereits registriert?{' '}
          <a href='/login' class='text-amber-600 hover:underline font-semibold'>Anmelden</a>
        </p>
      </div>
    </Layout>
  );
}
