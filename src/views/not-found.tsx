import { Layout } from './layout';
import type { User } from '../db/schema';
import { Button } from '../components/ui/button';

export function NotFoundPage({ user }: { user?: User | null }) {
  return (
    <Layout user={user} title='Seite nicht gefunden'>
      <div class='text-center py-20'>
        <p class='text-6xl font-black text-stone-200 mb-4' aria-hidden='true'>404</p>
        <h1 class='text-2xl font-bold text-stone-900 mb-2'>Seite nicht gefunden</h1>
        <p class='text-stone-600 font-medium mb-6'>
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <Button href='/' variant='primary'>Zur Startseite</Button>
      </div>
    </Layout>
  );
}
