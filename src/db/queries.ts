import type { User, Session, Project, Phase, Upload, ShareLink, TagStatus } from './schema';

// ===== Users =====
export async function createUser(
  db: D1Database,
  id: string,
  email: string,
  name: string,
  hashedPassword: string
): Promise<boolean> {
  const result = await db
    .prepare('INSERT INTO users (id, email, name, hashed_password) VALUES (?, ?, ?, ?)')
    .bind(id, email, name, hashedPassword)
    .run();
  return result.success;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db
    .prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
    .bind(id)
    .first<User>();
}

/** Returns full user including hashed_password (for password verification) */
export async function getUserWithPassword(
  db: D1Database,
  id: string
): Promise<User & { hashed_password: string } | null> {
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User & { hashed_password: string }>();
}

export async function updateUserPassword(
  db: D1Database,
  userId: string,
  hashedPassword: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE users SET hashed_password = ? WHERE id = ?')
    .bind(hashedPassword, userId)
    .run();
  return result.success;
}

// ===== Sessions =====
export async function createSession(
  db: D1Database,
  id: string,
  userId: string,
  expiresAt: string
): Promise<boolean> {
  const result = await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(id, userId, expiresAt)
    .run();
  return result.success;
}

export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  return db
    .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .bind(sessionId)
    .first<Session>();
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(sessionId)
    .run();
  return result.success;
}

export async function deleteUserSessions(db: D1Database, userId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();
  return result.success;
}

// ===== Projects =====
export async function createProject(
  db: D1Database,
  id: string,
  name: string,
  address: string,
  description: string,
  ownerId: string
): Promise<boolean> {
  const result = await db
    .prepare('INSERT INTO projects (id, name, address, description, owner_id) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, address, description, ownerId)
    .run();
  return result.success;
}

export async function getProjectsForUser(db: D1Database, userId: string): Promise<Project[]> {
  return db
    .prepare(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id
       WHERE p.owner_id = ? OR pc.user_id = ?
       ORDER BY p.updated_at DESC`
    )
    .bind(userId, userId)
    .all<Project>()
    .then(r => r.results);
}

export async function getProjectById(db: D1Database, projectId: string): Promise<Project | null> {
  return db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(projectId)
    .first<Project>();
}

export async function updateProject(
  db: D1Database,
  id: string,
  name: string,
  address: string,
  description: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE projects SET name = ?, address = ?, description = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(name, address, description, id)
    .run();
  return result.success;
}

export async function deleteProject(db: D1Database, projectId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM projects WHERE id = ?')
    .bind(projectId)
    .run();
  return result.success;
}

/** All uploads belonging to a project (across all phases) */
export async function getUploadsForProject(db: D1Database, projectId: string): Promise<Upload[]> {
  return db
    .prepare(
      `SELECT u.* FROM uploads u
       JOIN phases ph ON ph.id = u.phase_id
       WHERE ph.project_id = ?`
    )
    .bind(projectId)
    .all<Upload>()
    .then(r => r.results);
}

/** Deletes a project and all dependent rows (uploads, phases, share links, collaborators). */
export async function deleteProjectCascade(db: D1Database, projectId: string): Promise<boolean> {
  const results = await db.batch([
    db.prepare('DELETE FROM uploads WHERE phase_id IN (SELECT id FROM phases WHERE project_id = ?)').bind(projectId),
    db.prepare('DELETE FROM phases WHERE project_id = ?').bind(projectId),
    db.prepare('DELETE FROM share_links WHERE project_id = ?').bind(projectId),
    db.prepare('DELETE FROM project_collaborators WHERE project_id = ?').bind(projectId),
    db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId),
  ]);
  return results.every(r => r.success);
}

// ===== Project stats (for dashboard cards) =====
export interface ProjectStats {
  totalPhases: number;
  completedPhases: number;
  uploadCount: number;
}
export type ProjectStatsMap = Record<string, ProjectStats>;

export async function getProjectStats(db: D1Database, userId: string): Promise<ProjectStatsMap> {
  const phaseRows = await db
    .prepare(
      `SELECT ph.project_id AS project_id, COUNT(*) AS total_phases,
              SUM(CASE WHEN ph.status = 'completed' THEN 1 ELSE 0 END) AS completed_phases
       FROM phases ph
       JOIN projects p ON p.id = ph.project_id
       LEFT JOIN project_collaborators pc ON pc.project_id = p.id
       WHERE p.owner_id = ? OR pc.user_id = ?
       GROUP BY ph.project_id`
    )
    .bind(userId, userId)
    .all<{ project_id: string; total_phases: number; completed_phases: number | null }>()
    .then(r => r.results);

  const uploadRows = await db
    .prepare(
      `SELECT ph.project_id AS project_id, COUNT(*) AS upload_count
       FROM uploads u
       JOIN phases ph ON ph.id = u.phase_id
       JOIN projects p ON p.id = ph.project_id
       LEFT JOIN project_collaborators pc ON pc.project_id = p.id
       WHERE p.owner_id = ? OR pc.user_id = ?
       GROUP BY ph.project_id`
    )
    .bind(userId, userId)
    .all<{ project_id: string; upload_count: number }>()
    .then(r => r.results);

  const stats: ProjectStatsMap = {};
  for (const row of phaseRows) {
    stats[row.project_id] = {
      totalPhases: row.total_phases,
      completedPhases: row.completed_phases || 0,
      uploadCount: 0,
    };
  }
  for (const row of uploadRows) {
    if (!stats[row.project_id]) {
      stats[row.project_id] = { totalPhases: 0, completedPhases: 0, uploadCount: 0 };
    }
    stats[row.project_id].uploadCount = row.upload_count;
  }
  return stats;
}

// ===== Phases =====
export async function createPhasesForProject(
  db: D1Database,
  projectId: string,
  phaseNames: readonly string[]
): Promise<boolean> {
  const stmt = db.prepare(
    'INSERT INTO phases (id, project_id, name, sort_order) VALUES (?, ?, ?, ?)'
  );
  const batch = phaseNames.map((name, i) =>
    stmt.bind(crypto.randomUUID(), projectId, name, i + 1)
  );
  const results = await db.batch(batch);
  return results.every(r => r.success);
}

export async function getPhasesForProject(db: D1Database, projectId: string): Promise<Phase[]> {
  return db
    .prepare('SELECT * FROM phases WHERE project_id = ? ORDER BY sort_order')
    .bind(projectId)
    .all<Phase>()
    .then(r => r.results);
}

export async function getPhasesForProjects(
  db: D1Database,
  projectIds: string[]
): Promise<Map<string, Phase[]>> {
  const result = new Map<string, Phase[]>();
  if (projectIds.length === 0) return result;

  const placeholders = projectIds.map(() => '?').join(',');
  const rows = await db
    .prepare(`SELECT * FROM phases WHERE project_id IN (${placeholders}) ORDER BY project_id, sort_order`)
    .bind(...projectIds)
    .all<Phase>()
    .then(r => r.results);

  for (const phase of rows) {
    const list = result.get(phase.project_id);
    if (list) {
      list.push(phase);
    } else {
      result.set(phase.project_id, [phase]);
    }
  }
  return result;
}

export async function getPhaseById(db: D1Database, phaseId: string): Promise<Phase | null> {
  return db
    .prepare('SELECT * FROM phases WHERE id = ?')
    .bind(phaseId)
    .first<Phase>();
}

export async function completePhase(db: D1Database, phaseId: string): Promise<boolean> {
  const result = await db
    .prepare("UPDATE phases SET status = 'completed', completed_at = datetime('now') WHERE id = ?")
    .bind(phaseId)
    .run();
  return result.success;
}

export async function reopenPhase(db: D1Database, phaseId: string): Promise<boolean> {
  const result = await db
    .prepare("UPDATE phases SET status = 'in_progress', completed_at = NULL WHERE id = ?")
    .bind(phaseId)
    .run();
  return result.success;
}

export async function updatePhaseNotes(
  db: D1Database,
  phaseId: string,
  notes: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE phases SET notes = ? WHERE id = ?')
    .bind(notes, phaseId)
    .run();
  return result.success;
}

// ===== Uploads =====
export async function createUpload(
  db: D1Database,
  id: string,
  phaseId: string,
  userId: string,
  filename: string,
  type: 'image' | 'video' | 'doc',
  r2Key: string,
  mimeType: string,
  fileSize: number,
  notes: string,
  initialTags: string = ''
): Promise<boolean> {
  const tagStatus: TagStatus = type === 'image' ? 'pending' : 'none';
  const result = await db
    .prepare(
      `INSERT INTO uploads (id, phase_id, user_id, filename, type, r2_key, mime_type, file_size, notes, tags, manual_tags, ai_tags, tag_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, phaseId, userId, filename, type, r2Key, mimeType, fileSize, notes, initialTags, initialTags, '', tagStatus)
    .run();
  return result.success;
}

export async function getUploadsForPhase(db: D1Database, phaseId: string): Promise<Upload[]> {
  return db
    .prepare('SELECT * FROM uploads WHERE phase_id = ? ORDER BY created_at DESC')
    .bind(phaseId)
    .all<Upload>()
    .then(r => r.results);
}

const PAGE_SIZE = 20;

export async function getUploadsForPhasePaginated(
  db: D1Database,
  phaseId: string,
  page: number = 1,
  tag?: string
): Promise<{ uploads: Upload[]; total: number; page: number; totalPages: number }> {
  const offset = (page - 1) * PAGE_SIZE;
  const tagClause = tag ? "AND (',' || tags || ',') LIKE '%,' || ? || ',%'" : '';
  const uploadSql = 'SELECT * FROM uploads WHERE phase_id = ? ' + tagClause + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const countSql = 'SELECT COUNT(*) as count FROM uploads WHERE phase_id = ? ' + tagClause;
  const uploadStmt = tag
    ? db.prepare(uploadSql).bind(phaseId, tag, PAGE_SIZE, offset)
    : db.prepare(uploadSql).bind(phaseId, PAGE_SIZE, offset);
  const countStmt = tag
    ? db.prepare(countSql).bind(phaseId, tag)
    : db.prepare(countSql).bind(phaseId);
  const [uploadResult, countResult] = await db.batch([uploadStmt, countStmt]);
  const uploads = (uploadResult as { results: Upload[] }).results;
  const total = ((countResult as { results?: { count: number }[] }).results?.[0]?.count) || 0;
  return {
    uploads,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/** Get all unique tags used in a phase */
export async function getPhaseTags(db: D1Database, phaseId: string): Promise<string[]> {
  const rows = await db
    .prepare("SELECT tags FROM uploads WHERE phase_id = ? AND tags IS NOT NULL AND tags != ''")
    .bind(phaseId)
    .all<{ tags: string }>()
    .then(r => r.results);
  const tagSet = new Set<string>();
  for (const row of rows) {
    for (const t of row.tags.split(',')) {
      const trimmed = t.trim();
      if (trimmed) tagSet.add(trimmed);
    }
  }
  return [...tagSet].sort();
}

export async function countUploadsForPhase(db: D1Database, phaseId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM uploads WHERE phase_id = ?')
    .bind(phaseId)
    .first<{ count: number }>();
  return row?.count || 0;
}

export async function getUploadById(db: D1Database, uploadId: string): Promise<Upload | null> {
  return db
    .prepare('SELECT * FROM uploads WHERE id = ?')
    .bind(uploadId)
    .first<Upload>();
}

export async function deleteUpload(db: D1Database, uploadId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM uploads WHERE id = ?')
    .bind(uploadId)
    .run();
  return result.success;
}

export interface UpdateAiResultInput {
  tags?: string;
  aiTags?: string;
  description?: string;
  status: TagStatus;
  error?: string;
}

export async function updateUploadAiResult(
  db: D1Database,
  uploadId: string,
  result: UpdateAiResultInput
): Promise<boolean> {
  const changed = await db
    .prepare(
      'UPDATE uploads SET tags = ?, ai_tags = ?, ai_description = ?, tag_status = ?, tag_error = ? WHERE id = ?'
    )
    .bind(
      result.tags ?? '',
      result.aiTags ?? '',
      result.description ?? '',
      result.status,
      result.error ?? '',
      uploadId
    )
    .run();
  return changed.success;
}

// ===== Tag Aggregation =====
export interface TagSummaryItem {
  tag: string;
  count: number;
  phaseId: string;
}

/** Aggregate tags across all phases of a project (for project detail view) */
export async function getProjectTagSummary(
  db: D1Database,
  projectId: string
): Promise<TagSummaryItem[]> {
  const rows = await db
    .prepare(
      `SELECT u.tags, u.phase_id FROM uploads u
       JOIN phases ph ON ph.id = u.phase_id
       WHERE ph.project_id = ? AND u.tags IS NOT NULL AND u.tags != ''`
    )
    .bind(projectId)
    .all<{ tags: string; phase_id: string }>()
    .then(r => r.results);

  const tagMap = new Map<string, { count: number; phaseCounts: Map<string, number> }>();
  for (const row of rows) {
    for (const t of row.tags.split(',')) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      if (!tagMap.has(trimmed)) {
        tagMap.set(trimmed, { count: 0, phaseCounts: new Map() });
      }
      const entry = tagMap.get(trimmed)!;
      entry.count++;
      entry.phaseCounts.set(row.phase_id, (entry.phaseCounts.get(row.phase_id) || 0) + 1);
    }
  }

  return [...tagMap.entries()]
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      phaseId: [...data.phaseCounts.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ===== Project-level media queries (for new project overview) =====
export interface PhaseMediaCount {
  phase_id: string;
  count: number;
}

const PROJECT_PAGE_SIZE = 24;

export async function getUploadsForProjectPaginated(
  db: D1Database,
  projectId: string,
  options: { phaseIds?: string[]; tag?: string; q?: string; page?: number }
): Promise<{ uploads: Upload[]; total: number; page: number; totalPages: number }> {
  const { phaseIds, tag, q, page = 1 } = options;
  const offset = (page - 1) * PROJECT_PAGE_SIZE;

  let whereClause = 'ph.project_id = ?';
  const params: unknown[] = [projectId];

  if (phaseIds && phaseIds.length > 0) {
    const placeholders = phaseIds.map(() => '?').join(',');
    whereClause += ` AND u.phase_id IN (${placeholders})`;
    params.push(...phaseIds);
  }

  if (tag) {
    whereClause += " AND (',' || u.tags || ',') LIKE '%,' || ? || ',%'";
    params.push(tag);
  }

  if (q && q.trim().length > 0) {
    whereClause += ' AND (u.filename LIKE ? OR u.notes LIKE ? OR u.ai_description LIKE ? OR u.tags LIKE ?)';
    const like = '%' + q.trim() + '%';
    params.push(like, like, like, like);
  }

  const uploadSql = `SELECT u.* FROM uploads u JOIN phases ph ON ph.id = u.phase_id WHERE ${whereClause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as count FROM uploads u JOIN phases ph ON ph.id = u.phase_id WHERE ${whereClause}`;

  const uploadParams = [...params, PROJECT_PAGE_SIZE, offset];
  const countParams = [...params];

  const uploadStmt = db.prepare(uploadSql).bind(...uploadParams);
  const countStmt = db.prepare(countSql).bind(...countParams);

  const [uploadResult, countResult] = await db.batch([uploadStmt, countStmt]);
  const uploads = (uploadResult as { results: Upload[] }).results;
  const total = ((countResult as { results?: { count: number }[] }).results?.[0]?.count) || 0;

  return {
    uploads,
    total,
    page,
    totalPages: Math.ceil(total / PROJECT_PAGE_SIZE),
  };
}

export async function getMediaCountsByPhase(db: D1Database, projectId: string): Promise<PhaseMediaCount[]> {
  return db
    .prepare(
      `SELECT ph.id as phase_id, COUNT(u.id) as count
       FROM phases ph
       LEFT JOIN uploads u ON u.phase_id = ph.id
       WHERE ph.project_id = ?
       GROUP BY ph.id
       ORDER BY ph.sort_order`
    )
    .bind(projectId)
    .all<PhaseMediaCount>()
    .then(r => r.results);
}

export async function getTagsForProject(
  db: D1Database,
  projectId: string,
  phaseIds?: string[]
): Promise<string[]> {
  let sql = `SELECT u.tags FROM uploads u
             JOIN phases ph ON ph.id = u.phase_id
             WHERE ph.project_id = ? AND u.tags IS NOT NULL AND u.tags != ''`;
  const params: unknown[] = [projectId];

  if (phaseIds && phaseIds.length > 0) {
    const placeholders = phaseIds.map(() => '?').join(',');
    sql += ` AND u.phase_id IN (${placeholders})`;
    params.push(...phaseIds);
  }

  const rows = await db
    .prepare(sql)
    .bind(...params)
    .all<{ tags: string }>()
    .then(r => r.results);

  const tagSet = new Set<string>();
  for (const row of rows) {
    for (const t of row.tags.split(',')) {
      const trimmed = t.trim();
      if (trimmed) tagSet.add(trimmed);
    }
  }
  return [...tagSet].sort();
}

export interface ProjectTagWithCount {
  tag: string;
  count: number;
}

export async function getProjectTagsWithCounts(
  db: D1Database,
  projectId: string,
  phaseIds?: string[]
): Promise<ProjectTagWithCount[]> {
  let sql = `SELECT u.tags FROM uploads u
             JOIN phases ph ON ph.id = u.phase_id
             WHERE ph.project_id = ? AND u.tags IS NOT NULL AND u.tags != ''`;
  const params: unknown[] = [projectId];

  if (phaseIds && phaseIds.length > 0) {
    const placeholders = phaseIds.map(() => '?').join(',');
    sql += ` AND u.phase_id IN (${placeholders})`;
    params.push(...phaseIds);
  }

  const rows = await db
    .prepare(sql)
    .bind(...params)
    .all<{ tags: string }>()
    .then(r => r.results);

  const counts = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const raw of row.tags.split(',')) {
      const t = raw.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'de'));
}

// ===== Share Links =====
export async function createShareLink(
  db: D1Database,
  id: string,
  projectId: string,
  token: string,
  createdBy: string
): Promise<boolean> {
  const result = await db
    .prepare('INSERT INTO share_links (id, project_id, token, created_by) VALUES (?, ?, ?, ?)')
    .bind(id, projectId, token, createdBy)
    .run();
  return result.success;
}

export async function getShareLinksForProject(
  db: D1Database,
  projectId: string
): Promise<ShareLink[]> {
  return db
    .prepare('SELECT * FROM share_links WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC')
    .bind(projectId)
    .all<ShareLink>()
    .then(r => r.results);
}

export async function getShareLinkByToken(
  db: D1Database,
  token: string
): Promise<ShareLink | null> {
  return db
    .prepare('SELECT * FROM share_links WHERE token = ? AND is_active = 1')
    .bind(token)
    .first<ShareLink>();
}

export async function getShareLinkById(
  db: D1Database,
  linkId: string
): Promise<ShareLink | null> {
  return db
    .prepare('SELECT * FROM share_links WHERE id = ?')
    .bind(linkId)
    .first<ShareLink>();
}

export async function deactivateShareLink(
  db: D1Database,
  linkId: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE share_links SET is_active = 0 WHERE id = ?')
    .bind(linkId)
    .run();
  return result.success;
}

// ===== Collaborators =====
export async function addCollaborator(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('INSERT OR IGNORE INTO project_collaborators (project_id, user_id) VALUES (?, ?)')
    .bind(projectId, userId)
    .run();
  return result.success;
}

export async function isCollaborator(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM project_collaborators WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .first();
  return row !== null;
}

// ===== Upload Editing =====
export async function updateUploadTags(
  db: D1Database,
  uploadId: string,
  manualTags: string,
  mergedTags: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE uploads SET manual_tags = ?, tags = ? WHERE id = ?')
    .bind(manualTags, mergedTags, uploadId)
    .run();
  return result.success;
}

export async function updateUploadNotes(
  db: D1Database,
  uploadId: string,
  notes: string
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE uploads SET notes = ? WHERE id = ?')
    .bind(notes, uploadId)
    .run();
  return result.success;
}

// ===== Batch / Pending Uploads =====
export async function getPendingUploadsForProject(
  db: D1Database,
  projectId: string,
  limit: number = 20
): Promise<Upload[]> {
  return db
    .prepare(
      `SELECT u.* FROM uploads u
       JOIN phases ph ON ph.id = u.phase_id
       WHERE ph.project_id = ? AND u.type = 'image' AND u.tag_status IN ('pending', 'failed')
       ORDER BY u.created_at DESC LIMIT ?`
    )
    .bind(projectId, limit)
    .all<Upload>()
    .then(r => r.results);
}

// ===== KI Insights =====
export interface TopTagItem {
  tag: string;
  count: number;
}

export async function getTopTagsForProject(
  db: D1Database,
  projectId: string,
  limit: number = 5
): Promise<TopTagItem[]> {
  const rows = await db
    .prepare(
      `SELECT u.tags FROM uploads u
       JOIN phases ph ON ph.id = u.phase_id
       WHERE ph.project_id = ? AND u.tags IS NOT NULL AND u.tags != ''`
    )
    .bind(projectId)
    .all<{ tags: string }>()
    .then(r => r.results);

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const raw of row.tags.split(',')) {
      const t = raw.trim();
      if (!t) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
