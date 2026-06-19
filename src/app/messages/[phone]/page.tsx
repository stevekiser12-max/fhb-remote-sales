'use client';

import { Suspense } from 'react';
import ConversationInner from './ConversationInner';

export default function ConversationPage({ params }: { params: Promise<{ phone: string }> }) {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>}>
      <ConversationInner params={params} />
    </Suspense>
  );
}
