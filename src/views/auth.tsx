import { jsx } from 'hono/jsx';
import { Layout, Flash } from './layout';
import { Alert } from '../components/ui/alert';
import { InputField } from '../components/ui/input';
import { Button } from '../components/ui/button';

export function LoginPage({ error, redirect }: { error: string | null; redirect?: string }) {
  return (
    <Layout title='Anmelden'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-slate-900'>Anmelden</h1>
        {error && <Alert type='error'>{error}</Alert>}
        <form method='post' action='/login' class='space-y-4' aria-label='Anmeldeformular'>
          {redirect && <input type='hidden' name='redirect' value={redirect} />}
          <InputField type='email' name='email' id='email' label='E-Mail' required />
          <InputField type='password' name='password' id='password' label='Passwort' required />
          <Button type='submit' variant='primary' class='w-full'>Anmelden</Button>
        </form>
        <p class='mt-4 text-center text-base text-slate-600 font-medium'>
          Noch kein Konto?{' '}
          <a href='/register' class='text-accent hover:underline font-semibold'>Registrieren</a>
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
        {error && <Alert type='error'>{error}</Alert>}
        <form method='post' action='/register' class='space-y-4' aria-label='Registrierungsformular'>
          <InputField type='text' name='name' id='name' label='Name' required />
          <InputField type='email' name='email' id='email' label='E-Mail' required />
          <InputField type='password' name='password' id='password' label='Passwort' required minLength={8}
            hint='Mindestens 8 Zeichen' />
          <Button type='submit' variant='primary' class='w-full'>Registrieren</Button>
        </form>
        <p class='mt-4 text-center text-base text-slate-600 font-medium'>
          Bereits registriert?{' '}
          <a href='/login' class='text-accent hover:underline font-semibold'>Anmelden</a>
        </p>
      </div>
    </Layout>
  );
}

export function PasswordChangePage({ error, ok }: { error?: string | null; ok?: string | null }) {
  return (
    <Layout title='Passwort ändern'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-slate-900'>Passwort ändern</h1>
        <Flash error={error} ok={ok} />
        <form method='post' action='/account/password' class='space-y-4' aria-label='Passwort ändern'>
          <InputField type='password' name='currentPassword' id='currentPassword' label='Aktuelles Passwort' required />
          <InputField type='password' name='newPassword' id='newPassword' label='Neues Passwort' required minLength={8}
            hint='Mindestens 8 Zeichen' />
          <InputField type='password' name='confirmPassword' id='confirmPassword' label='Neues Passwort bestätigen' required minLength={8} />
          <Button type='submit' variant='primary' class='w-full'>Passwort ändern</Button>
        </form>
        <p class='mt-4 text-center text-base text-slate-600 font-medium'>
          <a href='/' class='text-accent hover:underline font-semibold'>&larr; Zur&uuml;ck zu den Projekten</a>
        </p>
      </div>
    </Layout>
  );
}
