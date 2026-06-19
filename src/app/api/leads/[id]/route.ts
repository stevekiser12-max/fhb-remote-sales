import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRecord, updateNotes, addNote, updateLeadStatus, convertLead } from '@/lib/zoho';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const module = req.nextUrl.searchParams.get('module') === 'contacts' ? 'Contacts' : 'Leads';

  try {
    const record = await getRecord(module as 'Leads' | 'Contacts', id);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (e) {
    console.error('Get record error:', e);
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const module = body.module === 'contacts' ? 'Contacts' : 'Leads';

  try {
    if (body.action === 'update_notes') {
      await updateNotes(module as 'Leads' | 'Contacts', id, body.notes);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'add_note') {
      // Append to the Description field (initial lead notes)
      await updateNotes(module as 'Leads' | 'Contacts', id, body.content);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update_status') {
      await updateLeadStatus(id, body.status);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'convert') {
      const result = await convertLead(id);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Update record error:', e);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}
