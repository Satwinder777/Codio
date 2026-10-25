import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(email, password);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'Server error during authentication.' },
      { status: 500 }
    );
  }
}
