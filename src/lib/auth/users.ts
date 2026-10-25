import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ppcnxyjvxtdfuztkoqtm.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_DlSp4rmdc4DYs1MkmJGHQA_w27v09A2';

const AUTH_ROOM_ID = '6cb2ebae-3d83-40bc-9a9b-7f05eb791311';
const AUTH_DOC_FILE = 'auth_users.json';

// In-memory cache for fast lookups
let inMemoryUsers: StoredUser[] = [];

// Local file fallback helper that never crashes on read-only environments (e.g. Vercel)
function getLocalFallbackPath(): string {
  try {
    const cwdDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(cwdDataDir)) {
      fs.mkdirSync(cwdDataDir, { recursive: true });
    }
    return path.join(cwdDataDir, 'users.json');
  } catch {
    const tmpDataDir = path.join(os.tmpdir(), 'codio_data');
    try {
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return path.join(tmpDataDir, 'users.json');
  }
}

function readLocalUsers(): StoredUser[] {
  try {
    const p = getLocalFallbackPath();
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf-8');
      return JSON.parse(data || '[]') as StoredUser[];
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalUsers(users: StoredUser[]): void {
  try {
    const p = getLocalFallbackPath();
    fs.writeFileSync(p, JSON.stringify(users, null, 2), 'utf-8');
  } catch {
    // ignore filesystem write errors on read-only environments
  }
}

export async function getAllUsers(): Promise<StoredUser[]> {
  try {
    // 1. Primary: Fetch from Supabase cloud database
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?room_id=eq.${AUTH_ROOM_ID}&file_name=eq.${AUTH_DOC_FILE}&select=content_snapshot`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].content_snapshot) {
        const parsed = JSON.parse(rows[0].content_snapshot) as StoredUser[];
        if (Array.isArray(parsed)) {
          inMemoryUsers = parsed;
          writeLocalUsers(parsed);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch users from Supabase cloud storage:', err);
  }

  // 2. Secondary fallback: in-memory / local storage
  if (inMemoryUsers.length > 0) return inMemoryUsers;
  const local = readLocalUsers();
  if (local.length > 0) {
    inMemoryUsers = local;
    return local;
  }

  return [];
}

async function persistUsers(users: StoredUser[]): Promise<boolean> {
  inMemoryUsers = users;
  writeLocalUsers(users);

  try {
    const payload = JSON.stringify(users);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?room_id=eq.${AUTH_ROOM_ID}&file_name=eq.${AUTH_DOC_FILE}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          content_snapshot: payload,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!res.ok) {
      // If row doesn't exist, insert it
      await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          room_id: AUTH_ROOM_ID,
          file_name: AUTH_DOC_FILE,
          content_snapshot: payload,
        }),
      });
    }
    return true;
  } catch (err) {
    console.error('Error persisting users to Supabase cloud:', err);
    return true;
  }
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await getAllUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user?: { id: string; name: string; email: string }; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || normalizedEmail.split('@')[0];

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return { error: 'An account with this email already exists. Please sign in.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const id = `usr_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;

  const newUser: StoredUser = {
    id,
    name: cleanName,
    email: normalizedEmail,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };

  const users = await getAllUsers();
  users.push(newUser);

  await persistUsers(users);

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
  };
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user?: { id: string; name: string; email: string }; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return { error: 'No account found with this email. Please sign up first.' };
  }

  const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
  if (hash !== user.hash) {
    return { error: 'Incorrect password. Please try again.' };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}
