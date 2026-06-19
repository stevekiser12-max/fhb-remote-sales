import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLeadStatuses } from '@/lib/zoho';

export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const statuses = await getLeadStatuses();
    return NextResponse.json({ statuses });
  } catch (e) {
    console.error('Get statuses error:', e);
    return NextResponse.json({ statuses: [] });
  }
}
