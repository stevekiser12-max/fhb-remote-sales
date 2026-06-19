'use client';

import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/messages', label: 'Messages', icon: '💬' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-around',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      paddingTop: 8,
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? pathname === '/' || pathname.startsWith('/lead/')
          : pathname.startsWith(tab.path);

        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              padding: '4px 16px',
              minWidth: 64,
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{
              fontSize: 11,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
