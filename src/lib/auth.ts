import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'xuperstream-super-secret-key-2025-demo';

// --- Password Hashing (SHA-256 salted) ---

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  // Support seed-style simple password: "seed:password"
  if (storedHash.startsWith('seed:')) {
    return storedHash.slice(5) === password;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (!salt || !hash) return false;
  const computedHash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  try {
    return timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// --- Simple JWT ---

interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  exp: number;
}

export function generateToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmacSha256(`${header}.${payloadB64}`, JWT_SECRET);
  return `${header}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify signature
    const expectedSig = createHmacSha256(`${header}.${payload}`, JWT_SECRET);
    if (signature !== expectedSig) return null;

    // Check expiration
    const decoded: TokenPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    );
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch {
    return null;
  }
}

function createHmacSha256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}
