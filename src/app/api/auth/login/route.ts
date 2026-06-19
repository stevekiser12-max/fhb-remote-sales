import { NextRequest, NextResponse } from 'next/server';
import { authenticatePin, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin) {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  const member = authenticatePin(pin);
  if (!member) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const token = await createSession(member.id);

  const response = NextResponse.json({
    success: true,
    user: { id: member.id, name: member.name },
  });

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}
