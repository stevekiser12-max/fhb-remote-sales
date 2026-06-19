import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveSubscription } from '@/lib/push-store';

export async function POST(req: NextRequest) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const subscription = await req.json();

  if (!subscription.endpoint || !subscription.keys) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await saveSubscription(member.id, subscription);

  return NextResponse.json({ success: true });
}
