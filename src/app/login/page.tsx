'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        setError('Invalid PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (key: string) => {
    if (key === 'delete') {
      setPin(p => p.slice(0, -1));
    } else if (key === 'enter') {
      handleSubmit();
    } else if (pin.length < 4) {
      setPin(p => p + key);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg)',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Lead Pilot</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Favored Home Buyers
        </p>
      </div>

      {/* PIN dots */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 32,
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: i < pin.length ? 'var(--accent)' : 'var(--surface-2)',
            border: `2px solid ${i < pin.length ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }} />
        ))}
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      {/* Number pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: 12,
        marginBottom: 24,
      }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map(key => (
          <button
            key={key || 'empty'}
            onClick={() => key && handleKeyDown(key)}
            disabled={!key || loading}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: 'none',
              background: key === 'delete' ? 'transparent' : key ? 'var(--surface-2)' : 'transparent',
              color: 'var(--text)',
              fontSize: key === 'delete' ? 20 : 24,
              fontWeight: 500,
              cursor: key ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {key === 'delete' ? '⌫' : key}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={pin.length < 4 || loading}
        style={{
          width: '100%',
          maxWidth: 240,
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          background: pin.length >= 4 ? 'var(--accent)' : 'var(--surface-2)',
          color: pin.length >= 4 ? '#fff' : 'var(--text-muted)',
          fontSize: 16,
          fontWeight: 600,
          cursor: pin.length >= 4 ? 'pointer' : 'default',
          transition: 'all 0.15s',
        }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </div>
  );
}
