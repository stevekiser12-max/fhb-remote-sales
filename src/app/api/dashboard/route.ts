import { NextResponse } from 'next/server';
import { getSession, getOwnerNames } from '@/lib/auth';
import { getDashboardCounts, getLeadsByStatus } from '@/lib/zoho';

// Cache dashboard results for 60 seconds to avoid Zoho rate limits
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET() {
  const member = await getSession();
  if (!member) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ownerNames = getOwnerNames(member);
  const cacheKey = `dashboard:${member.id}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch counts first, then urgent leads (serial to reduce burst)
    const counts = await getDashboardCounts(ownerNames);
    const urgent = await getLeadsByStatus(ownerNames, [
      'New Lead',
      'New No Contact',
      'Incoming - Needs Reply',
      'Follow-up',
    ], 10);

    const result = { counts, urgent };

    // Cache it
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(result);
  } catch (e) {
    console.error('Dashboard error:', e);
    // Return stale cache if available
    if (cached) {
      return NextResponse.json(cached.data);
    }
    return NextResponse.json({ counts: {}, urgent: [] }, { status: 500 });
  }
}
