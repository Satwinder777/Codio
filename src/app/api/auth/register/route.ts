import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = registerUser(name || '', email, password);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration API error:', err);
    return NextResponse.json(
      { error: 'Server error during registration.' },
      { status: 500 }
    );
  }
}
