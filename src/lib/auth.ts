import { createSession, deleteSession, getSession, getUserById } from '../db/queries';
import type { Env, User } from '../db/schema';
import { Context } from 'hono';

// Generate a random session ID
function generateId(): string {
  return crypto.randomUUID();
}

// Password hashing with Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key) as ArrayBuffer;
  const hashArray = new Uint8Array(exported);
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${saltHex}:${hashHex}`;
}

// Verify password against hash
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key) as ArrayBuffer;
  const hashArray = new Uint8Array(exported);
  const computedHash = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computedHash === hashHex;
}

// Create a session for a user
export async function createUserSession(
  db: D1Database,
  userId: string
): Promise<string> {
  const sessionId = generateId();
  // Sessions expire after 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');
  await createSession(db, sessionId, userId, expiresAt);
  return sessionId;
}

// Get the current user from a request
export async function getCurrentUser(
  db: D1Database,
  cookieHeader: string | null
): Promise<User | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies['session'];
  if (!sessionId) return null;
  const session = await getSession(db, sessionId);
  if (!session) return null;
  return getUserById(db, session.user_id);
}

// Destroy a session
export async function destroySession(
  db: D1Database,
  cookieHeader: string | null
): Promise<void> {
  if (!cookieHeader) return;
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies['session'];
  if (sessionId) {
    await deleteSession(db, sessionId);
  }
}

// Simple cookie parser
function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  header.split(';').forEach(cookie => {
    const [key, ...val] = cookie.trim().split('=');
    if (key && val.length > 0) {
      result[key.trim()] = val.join('=').trim();
    }
  });
  return result;
}

export { hashPassword, verifyPassword, generateId };
