import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getBlueprint, executeTransition } from '@/lib/zoho';

// GET — fetch available blueprint transitions for a record
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const module = req.nextUrl.searchParams.get('module') === 'contacts' ? 'Contacts' : 'Leads';

  try {
    const blueprint = await getBlueprint(module, id);
    return NextResponse.json(blueprint);
  } catch (e) {
    console.error('Get blueprint error:', e);
    return NextResponse.json({ transitions: [] });
  }
}

// POST — execute a blueprint transition
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const module = body.module === 'contacts' ? 'Contacts' : 'Leads';

  try {
    const result = await executeTransition(module, id, body.transitionId, body.data || {});
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Execute transition error:', e);
    const msg = e instanceof Error ? e.message : 'Failed to execute transition';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
