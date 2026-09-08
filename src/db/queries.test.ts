import { describe, it, expect, vi } from 'vitest';
import {
  createUser,
  getUserByEmail,
  createProject,
  getProjectsForUser,
  getUploadsForPhase,
  createPhasesForProject,
  updatePhaseNotes,
} from './queries';

// Create a mock D1Database
function createMockDb(): D1Database {
  const store = new Map<string, unknown[]>();
  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        bind: vi.fn((...args: unknown[]) => ({
          ...stmt,
          boundArgs: args,
          run: vi.fn(async () => ({ success: true, meta: {} })),
          first: vi.fn(async <T = unknown>(): Promise<T | null> => {
            const table = sql.match(/FROM\s+(\w+)/i)?.[1] || '';
            const rows = store.get(table) || [];
            return (rows[0] as T) ?? null;
          }),
          all: vi.fn(async <T = unknown>() => {
            const table = sql.match(/FROM\s+(\w+)/i)?.[1] || '';
            const rows = store.get(table) || [];
            return { results: rows as T[], success: true };
          }),
        })),
      };
      return stmt;
    }),
    batch: vi.fn(async (statements: unknown[]) => {
      return statements.map(() => ({ success: true, meta: {} }));
    }),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

describe('createUser', () => {
  it('should insert a user successfully', async () => {
    const db = createMockDb();
    const result = await createUser(db, 'id-1', 'test@test.com', 'Test', 'hashed-pw');
    expect(result).toBe(true);
  });
});

describe('getUserByEmail', () => {
  it('should return null for non-existent user', async () => {
    const db = createMockDb();
    const user = await getUserByEmail(db, 'nonexistent@test.com');
    expect(user).toBeNull();
  });
});

describe('createProject', () => {
  it('should create a project successfully', async () => {
    const db = createMockDb();
    const result = await createProject(db, 'proj-1', 'Test Project', 'Addr', 'Desc', 'user-1');
    expect(result).toBe(true);
  });
});

describe('getProjectsForUser', () => {
  it('should return empty array for user with no projects', async () => {
    const db = createMockDb();
    const projects = await getProjectsForUser(db, 'user-1');
    expect(projects).toEqual([]);
  });
});

describe('createPhasesForProject', () => {
  it('should create multiple phases', async () => {
    const db = createMockDb();
    const names = ['Phase 1', 'Phase 2', 'Phase 3'] as const;
    const result = await createPhasesForProject(db, 'proj-1', names);
    expect(result).toBe(true);
  });
});

describe('getUploadsForPhase', () => {
  it('should return empty array for phase with no uploads', async () => {
    const db = createMockDb();
    const uploads = await getUploadsForPhase(db, 'phase-1');
    expect(uploads).toEqual([]);
  });
});

describe('updatePhaseNotes', () => {
  it('should call prepare with UPDATE phases and bind notes + id', async () => {
    const db = createMockDb();
    const result = await updatePhaseNotes(db, 'phase-1', 'Neue Notiz');
    expect(result).toBe(true);
    expect(db.prepare).toHaveBeenCalled();
    const sql = (db.prepare as unknown as { mock: { calls: [string][] } }).mock.calls[0][0];
    expect(sql.toLowerCase()).toContain('update phases');
    expect(sql.toLowerCase()).toContain('notes');
  });
});
