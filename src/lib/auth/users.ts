import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getAllUsers(): StoredUser[] {
  try {
    ensureDataFile();
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content || '[]') as StoredUser[];
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

export function findUserByEmail(email: string): StoredUser | null {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function registerUser(
  name: string,
  email: string,
  password: string
): { user?: { id: string; name: string; email: string }; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || normalizedEmail.split('@')[0];

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const existing = findUserByEmail(normalizedEmail);
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

  const users = getAllUsers();
  users.push(newUser);

  try {
    ensureDataFile();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users file:', err);
    return { error: 'Failed to save account. Please try again.' };
  }

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
  };
}

export function authenticateUser(
  email: string,
  password: string
): { user?: { id: string; name: string; email: string }; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = findUserByEmail(normalizedEmail);

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
