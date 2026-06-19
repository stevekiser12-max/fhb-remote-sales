'use client';

import { Suspense } from 'react';
import LeadDetailInner from './LeadDetailInner';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>}>
      <LeadDetailInner params={params} />
    </Suspense>
  );
}
