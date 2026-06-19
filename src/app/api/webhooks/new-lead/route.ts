import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/push';
import { TEAM, SHARED_OWNER } from '@/lib/auth';

// Zoho workflow webhook — fires when a new lead is created
// or can be called by our RC webhook service on inbound SMS
export async function POST(req: NextRequest) {
  // Simple auth check — use a secret in the webhook URL
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      type = 'new_lead', // new_lead | inbound_sms
      leadName,
      leadId,
      ownerName,
      phone,
      address,
      message,
    } = body;

    if (type === 'new_lead') {
      // Find which team member owns this lead
      const member = TEAM.find(m => m.zohoName === ownerName);
      const isShared = ownerName === SHARED_OWNER;

      const payload = {
        title: '🔴 New Lead!',
        body: `${leadName || 'New lead'}${address ? ` — ${address}` : ''}`,
        url: leadId ? `/lead/${leadId}?type=lead` : '/',
        tag: `new-lead-${leadId}`,
      };

      if (isShared) {
        // Olivia Hayes lead — notify everyone
        await sendPushToAll(payload);
      } else if (member) {
        // Notify specific team member
        const { sendPush } = await import('@/lib/push');
        await sendPush(member.id, payload);
      }
    } else if (type === 'inbound_sms') {
      // Inbound text — notify the rep who owns the lead
      const member = TEAM.find(m => m.zohoName === ownerName);

      const payload = {
        title: '💬 New Text',
        body: `${leadName || phone}: ${message || 'sent a message'}`,
        url: phone ? `/messages/${encodeURIComponent(phone)}?name=${encodeURIComponent(leadName || '')}` : '/messages',
        tag: `sms-${phone}`,
      };

      if (member) {
        const { sendPush } = await import('@/lib/push');
        await sendPush(member.id, payload);
      } else {
        // Unknown owner — notify everyone
        await sendPushToAll(payload);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
