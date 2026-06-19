import { NextResponse } from 'next/server';
import { getSession, getOwnerNames } from '@/lib/auth';
import { getRCAccessToken } from '@/lib/rc-store';
import { getRecentConversations } from '@/lib/ringcentral';
import { searchRecords } from '@/lib/zoho';

// GET — fetch conversations with unreplied inbound messages
export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rc = await getRCAccessToken(member.id);
  if (!rc) {
    return NextResponse.json({ error: 'RingCentral not connected', conversations: [] }, { status: 200 });
  }

  try {
    const convos = await getRecentConversations(rc.accessToken, 200);
    const ownerNames = getOwnerNames(member);

    // Find conversations where the last message is inbound (needs reply)
    const needsReply: {
      phone: string;
      lastMessage: string;
      lastMessageTime: string;
      name: string;
      leadId: string;
      leadType: string;
      unreadCount: number;
    }[] = [];

    for (const [phone, messages] of convos.entries()) {
      // Sort by time descending
      const sorted = [...messages].sort(
        (a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime()
      );

      const lastMsg = sorted[0];
      if (!lastMsg || lastMsg.direction !== 'Inbound') continue;

      // Count consecutive unread inbound messages from the end
      let unreadCount = 0;
      for (const msg of sorted) {
        if (msg.direction === 'Inbound') {
          unreadCount++;
        } else {
          break;
        }
      }

      needsReply.push({
        phone,
        lastMessage: lastMsg.subject || '',
        lastMessageTime: lastMsg.creationTime,
        name: '', // Will try to match from Zoho
        leadId: '',
        leadType: '',
        unreadCount,
      });
    }

    // Sort by most recent first
    needsReply.sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    // Try to match phone numbers to Zoho leads/contacts (batch lookup)
    // Only do first 20 to avoid rate limiting
    const toMatch = needsReply.slice(0, 20);
    await Promise.all(
      toMatch.map(async (convo) => {
        try {
          // Strip +1 for search
          const searchPhone = convo.phone.replace(/^\+1/, '');
          const records = await searchRecords(searchPhone, ownerNames);
          if (records.length > 0) {
            convo.name = records[0].fullName;
            convo.leadId = records[0].id;
            convo.leadType = records[0].type;
          }
        } catch {
          // No match found
        }
      })
    );

    return NextResponse.json({ conversations: needsReply });
  } catch (e) {
    console.error('Inbox error:', e);
    return NextResponse.json({ conversations: [] });
  }
}
