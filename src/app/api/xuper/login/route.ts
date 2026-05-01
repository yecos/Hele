import { NextRequest, NextResponse } from 'next/server';
import { getXuperClient } from '@/lib/guardian/xuper-client';

/**
 * POST /api/xuper/login
 * Login a los servidores Xuper TV
 * 
 * Body: { username: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere username y password',
      }, { status: 400 });
    }

    const client = getXuperClient();
    const result = await client.login(username, password);

    if (result.code === 200 && result.data.token) {
      return NextResponse.json({
        success: true,
        token: result.data.token.substring(0, 10) + '...',
        userId: result.data.userId,
        vipLevel: result.data.vipLevel,
        expireTime: result.data.expireTime,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.msg || 'Login fallido',
      code: result.code,
    }, { status: 401 });
  } catch (error) {
    console.error('[Xuper API] Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error de conexión con los servidores Xuper',
    }, { status: 500 });
  }
}
