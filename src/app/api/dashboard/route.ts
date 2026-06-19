import { NextResponse } from 'next/server';
import { getSession, getOwnerNames } from '@/lib/auth';
import { getDashboardCounts, getLeadsByStatus } from '@/lib/zoho';

export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ownerNames = getOwnerNames(member);

  try {
    const [counts, urgent] = await Promise.all([
      getDashboardCounts(ownerNames),
      getLeadsByStatus(ownerNames, [
        'New Lead',
        'New No Contact',
        'Incoming - Needs Reply',
        'Follow-up',
      ], 10),
    ]);

    return NextResponse.json({ counts, urgent });
  } catch (e) {
    console.error('Dashboard error:', e);
    return NextResponse.json({ counts: {}, urgent: [] }, { status: 500 });
  }
}
