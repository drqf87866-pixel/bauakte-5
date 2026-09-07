import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import { getProjectsWithPhaseOverview } from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { PhasesOverviewPage } from '../views/phases-overview';

type StatusFilter = 'all' | 'in_progress' | 'completed';

const phaseOverviewRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

phaseOverviewRoutes.get('/phases', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rawStatus = c.req.query('status');
  const status: StatusFilter =
    rawStatus === 'in_progress' || rawStatus === 'completed' ? rawStatus : 'all';

  const items = await getProjectsWithPhaseOverview(c.env.DB, user.id);
  return c.html(
    <PhasesOverviewPage
      user={user}
      items={items}
      status={status}
      ok={c.req.query('ok')}
      error={c.req.query('error')}
    />
  );
});

export default phaseOverviewRoutes;
