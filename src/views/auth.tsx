import { Layout, Flash } from './layout';
import { Alert } from '../components/ui/alert';
import { InputField } from '../components/ui/input';
import { Button } from '../components/ui/button';

export function LoginPage({ error, redirect, ok }: { error: string | null; redirect?: string; ok?: string | null }) {
  return (
    <Layout title='Anmelden'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-stone-900'>Anmelden</h1>
        {error && <Alert type='error'>{error}</Alert>}
        <Flash error={null} ok={ok} />
        <form method='post' action='/login' class='space-y-4' aria-label='Anmeldeformular'>
          {redirect && <input type='hidden' name='redirect' value={redirect} />}
          <InputField type='email' name='email' id='email' label='E-Mail' required />
          <InputField type='password' name='password' id='password' label='Passwort' required />
          <Button type='submit' variant='primary' class='w-full'>Anmelden</Button>
        </form>
        <p class='mt-4 text-center text-base text-stone-600 font-medium'>
          <a href='/forgot-password' class='text-accent hover:underline font-semibold'>Passwort vergessen?</a>
        </p>
        <p class='mt-2 text-center text-base text-stone-600 font-medium'>
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
        <h1 class='text-2xl font-bold mb-6 text-stone-900'>Registrieren</h1>
        {error && <Alert type='error'>{error}</Alert>}
        <form method='post' action='/register' class='space-y-4' aria-label='Registrierungsformular'>
          <InputField type='text' name='name' id='name' label='Name' required />
          <InputField type='email' name='email' id='email' label='E-Mail' required />
          <InputField type='password' name='password' id='password' label='Passwort' required minLength={8}
            hint='Mindestens 8 Zeichen' />
          <Button type='submit' variant='primary' class='w-full'>Registrieren</Button>
        </form>
        <p class='mt-4 text-center text-base text-stone-600 font-medium'>
          Bereits registriert?{' '}
          <a href='/login' class='text-accent hover:underline font-semibold'>Anmelden</a>
        </p>
      </div>
    </Layout>
  );
}

export function ForgotPasswordPage({ error, ok, resetLink }: { error?: string | null; ok?: string | null; resetLink?: string }) {
  return (
    <Layout title='Passwort vergessen'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-stone-900'>Passwort vergessen</h1>
        <Flash error={error} ok={ok} />
        {resetLink && (
          <div class='card mb-4 bg-accent-light border border-[#f3e4c4]'>
            <p class='text-sm font-semibold text-[#8a6a1f] mb-2'>Link zum Zurücksetzen (E-Mail-Versand noch nicht implementiert):</p>
            <a href={resetLink} class='text-accent underline font-semibold break-all'>{resetLink}</a>
          </div>
        )}
        <form method='post' action='/forgot-password' class='space-y-4' aria-label='Passwort zurücksetzen'>
          <InputField type='email' name='email' id='email' label='E-Mail' required />
          <Button type='submit' variant='primary' class='w-full'>Link zum Zurücksetzen senden</Button>
        </form>
        <p class='mt-4 text-center text-base text-stone-600 font-medium'>
          <a href='/login' class='text-accent hover:underline font-semibold'>&larr; Zur&uuml;ck zum Login</a>
        </p>
      </div>
    </Layout>
  );
}

export function ResetPasswordPage({ error, token }: { error?: string | null; token: string }) {
  return (
    <Layout title='Neues Passwort'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-stone-900'>Neues Passwort festlegen</h1>
        {error && <Alert type='error'>{error}</Alert>}
        <form method='post' action={'/reset-password/' + token} class='space-y-4' aria-label='Neues Passwort'>
          <InputField type='password' name='password' id='password' label='Neues Passwort' required minLength={8}
            hint='Mindestens 8 Zeichen' />
          <InputField type='password' name='confirmPassword' id='confirmPassword' label='Passwort bestätigen' required minLength={8} />
          <Button type='submit' variant='primary' class='w-full'>Passwort zurücksetzen</Button>
        </form>
      </div>
    </Layout>
  );
}

export function PasswordChangePage({ error, ok }: { error?: string | null; ok?: string | null }) {
  return (
    <Layout title='Passwort ändern'>
      <div class='max-w-md mx-auto mt-12'>
        <h1 class='text-2xl font-bold mb-6 text-stone-900'>Passwort ändern</h1>
        <Flash error={error} ok={ok} />
        <form method='post' action='/account/password' class='space-y-4' aria-label='Passwort ändern'>
          <InputField type='password' name='currentPassword' id='currentPassword' label='Aktuelles Passwort' required />
          <InputField type='password' name='newPassword' id='newPassword' label='Neues Passwort' required minLength={8}
            hint='Mindestens 8 Zeichen' />
          <InputField type='password' name='confirmPassword' id='confirmPassword' label='Neues Passwort bestätigen' required minLength={8} />
          <Button type='submit' variant='primary' class='w-full'>Passwort ändern</Button>
        </form>
        <p class='mt-4 text-center text-base text-stone-600 font-medium'>
          <a href='/' class='text-accent hover:underline font-semibold'>&larr; Zur&uuml;ck zu den Projekten</a>
        </p>
      </div>
    </Layout>
  );
}
