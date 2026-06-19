import { NextRequest, NextResponse } from 'next/server';
import { TEAM, SHARED_OWNER } from '@/lib/auth';

// RingCentral webhook for inbound SMS notifications
// Can be called by our existing RC webhook service or directly by RC
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // RC sends a validation request first
    if (body.event === '/restapi/v1.0/subscription/~?threshold=60&interval=15') {
      return new NextResponse(body.validationToken, {
        status: 200,
        headers: { 'Validation-Token': body.validationToken },
      });
    }

    // Handle instant message events
    if (body.event?.includes('/message-store') || body.body?.type === 'SMS') {
      const msg = body.body;
      if (!msg || msg.direction !== 'Inbound') {
        return NextResponse.json({ ok: true });
      }

      const fromNumber = msg.from?.phoneNumber || '';
      const toNumber = msg.to?.[0]?.phoneNumber || '';
      const messageText = msg.subject || '';

      console.log(`[RC Webhook] Inbound SMS from ${fromNumber} to ${toNumber}: ${messageText.substring(0, 50)}`);

      // Find which team member this is for based on the to number
      // For now, notify everyone about inbound texts
      const { sendPushToAll } = await import('@/lib/push');
      await sendPushToAll({
        title: '💬 Incoming Text',
        body: `${fromNumber}: ${messageText.substring(0, 100)}`,
        url: `/messages/${encodeURIComponent(fromNumber)}`,
        tag: `sms-inbound-${fromNumber}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('RC SMS webhook error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
