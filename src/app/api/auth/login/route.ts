import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { USERS_DB } from '@/lib/users';

// Secure token generation using crypto
function generateToken(username: string): string {
  const random = randomBytes(32).toString('hex');
  return Buffer.from(`${username}:${Date.now()}:${random}`).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Usuario y contraseña requeridos' });
    }

    const user = USERS_DB[username.toLowerCase()];
    if (!user || user.password !== password) {
      return NextResponse.json({ success: false, error: 'Credenciales incorrectas' });
    }

    const token = generateToken(username);

    return NextResponse.json({
      success: true,
      username: username.toLowerCase(),
      token,
    });
  } catch (e) {
    console.warn('[Auth Login] Server error:', e);
    return NextResponse.json({ success: false, error: 'Error del servidor' });
  }
}
