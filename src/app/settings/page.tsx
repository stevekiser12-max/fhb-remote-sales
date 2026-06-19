'use client';

import { Suspense } from 'react';
import SettingsInner from './SettingsInner';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>}>
      <SettingsInner />
    </Suspense>
  );
}
