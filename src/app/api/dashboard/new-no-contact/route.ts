import { NextResponse } from 'next/server';
import { getSession, getOwnerNames } from '@/lib/auth';
import { getNewNoContactBreakdown } from '@/lib/zoho';

export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ownerNames = getOwnerNames(member);

  try {
    const breakdown = await getNewNoContactBreakdown(ownerNames);
    return NextResponse.json(breakdown);
  } catch (e) {
    console.error('New No Contact breakdown error:', e);
    return NextResponse.json({ total: 0, within7d: 0, within14d: 0, within30d: 0, over30d: 0, records: [] });
  }
}
