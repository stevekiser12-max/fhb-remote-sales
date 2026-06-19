'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function SettingsInner() {
  const [user, setUser] = useState<{ id: string; name: string; rcConnected: boolean } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const rcStatus = searchParams.get('rc');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => setUser(data))
      .catch(() => router.push('/login'));
  }, [router]);

  const handleRCConnect = () => {
    window.location.href = '/api/auth/rc';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>⚙️ Settings</h1>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rcStatus === 'connected' && (
          <div style={{
            background: '#22c55e20',
            border: '1px solid #22c55e40',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#22c55e',
            fontSize: 14,
            fontWeight: 500,
          }}>
            ✅ RingCentral connected successfully!
          </div>
        )}

        {errorParam && (
          <div style={{
            background: '#ef444420',
            border: '1px solid #ef444440',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: 14,
          }}>
            ❌ {errorParam === 'rc_failed' ? 'Failed to connect RingCentral. Try again.' : errorParam}
          </div>
        )}

        {/* Profile */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Profile</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
            }}>
              {user.name[0]}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>FHB Sales Team</p>
            </div>
          </div>
        </div>

        {/* RingCentral */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 14,
          padding: 16,
          border: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>RingCentral</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Connect to send and receive texts from the app
          </p>

          {user.rcConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }} />
              <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>Connected</span>
            </div>
          ) : (
            <button
              onClick={handleRCConnect}
              className="action-btn"
              style={{
                width: '100%',
                background: '#f97316',
                color: '#fff',
              }}
            >
              🔗 Connect RingCentral
            </button>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="action-btn"
          style={{
            width: '100%',
            background: '#ef444420',
            color: '#ef4444',
            border: '1px solid #ef444440',
          }}
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
