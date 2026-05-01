import { NextRequest, NextResponse } from 'next/server';

// Simple auth - credentials stored server-side
const USERS: Record<string, string> = {
  admin: 'admin123',
  hele: 'hele123',
  usuario: 'usuario123',
};

// Simple token generation (for personal use only)
function generateToken(username: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return Buffer.from(`${username}:${timestamp}:${random}`).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Usuario y contraseña requeridos' });
    }

    const expectedPassword = USERS[username.toLowerCase()];
    if (!expectedPassword || expectedPassword !== password) {
      return NextResponse.json({ success: false, error: 'Credenciales incorrectas' });
    }

    const token = generateToken(username);

    return NextResponse.json({
      success: true,
      username: username.toLowerCase(),
      token,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Error del servidor' });
  }
}
