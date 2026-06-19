import { NextRequest, NextResponse } from 'next/server';
import { getSession, getOwnerNames } from '@/lib/auth';
import { getLeads, getContacts, searchRecords } from '@/lib/zoho';

export async function GET(req: NextRequest) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const tab = searchParams.get('tab') || 'leads'; // leads | contacts
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const ownerNames = getOwnerNames(member);

  try {
    if (search) {
      const records = await searchRecords(search, ownerNames);
      return NextResponse.json({ records, hasMore: false });
    }

    if (tab === 'contacts') {
      const result = await getContacts(ownerNames, page);
      return NextResponse.json(result);
    }

    const result = await getLeads(ownerNames, page, 20, statusFilter || undefined);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Leads API error:', e);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
