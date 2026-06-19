import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRCAccessToken } from '@/lib/rc-store';
import { sendSMS, getConversation } from '@/lib/ringcentral';

// GET — fetch SMS conversation with a phone number
export async function GET(req: NextRequest) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const phoneNumber = req.nextUrl.searchParams.get('phone');
  console.log('[SMS API] GET request for phone:', phoneNumber, '| member:', member.id);
  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  const rc = await getRCAccessToken(member.id);
  if (!rc) {
    return NextResponse.json({ error: 'RingCentral not connected. Go to Settings to connect.' }, { status: 403 });
  }

  try {
    const result = await getConversation(rc.accessToken, phoneNumber);
    return NextResponse.json({ ...result, fromNumber: rc.phoneNumber });
  } catch (e) {
    console.error('Get conversation error:', e);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST — send an SMS
export async function POST(req: NextRequest) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { to, text } = await req.json();
  if (!to || !text) {
    return NextResponse.json({ error: 'to and text required' }, { status: 400 });
  }

  const rc = await getRCAccessToken(member.id);
  if (!rc) {
    return NextResponse.json({ error: 'RingCentral not connected. Go to Settings to connect.' }, { status: 403 });
  }

  try {
    const message = await sendSMS(rc.accessToken, rc.phoneNumber, to, text);
    return NextResponse.json({ success: true, message });
  } catch (e) {
    console.error('Send SMS error:', e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
