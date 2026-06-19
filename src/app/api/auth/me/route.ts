import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isRCConnected } from '@/lib/rc-store';

export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rcConnected = await isRCConnected(member.id);

  return NextResponse.json({
    id: member.id,
    name: member.name,
    rcConnected,
  });
}
