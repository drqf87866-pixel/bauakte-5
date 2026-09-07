import { jsx } from 'hono/jsx';
import { Layout } from './layout';
import type { User } from '../db/schema';

export function NotFoundPage({ user }: { user?: User | null }) {
  return (
    <Layout user={user} title='Seite nicht gefunden'>
      <div class='text-center py-20'>
        <p class='text-6xl font-black text-slate-200 mb-4' aria-hidden='true'>404</p>
        <h1 class='text-2xl font-bold text-slate-900 mb-2'>Seite nicht gefunden</h1>
        <p class='text-slate-600 font-medium mb-6'>
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <a href='/'
          class='inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition min-h-[48px] font-semibold text-base no-underline'>
          Zur Startseite
        </a>
      </div>
    </Layout>
  );
}
