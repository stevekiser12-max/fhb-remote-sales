'use client';

import { useRouter } from 'next/navigation';

interface LeadCardProps {
  id: string;
  type: 'lead' | 'contact';
  fullName: string;
  address: string;
  status: string;
  owner: string;
  phone: string;
  modifiedTime: string;
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('not contacted') || s.includes('new')) return 'var(--accent)';
  if (s.includes('attempted') || s.includes('contacted')) return 'var(--orange)';
  if (s.includes('qualified') || s.includes('interested')) return 'var(--green)';
  if (s.includes('unqualified') || s.includes('lost') || s.includes('junk')) return 'var(--red)';
  if (s.includes('converted')) return 'var(--purple)';
  return 'var(--text-muted)';
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function LeadCard({ id, type, fullName, address, status, owner, phone, modifiedTime }: LeadCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/lead/${id}?type=${type}`)}
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        transition: 'background 0.1s',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{fullName}</span>
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              background: type === 'lead' ? 'var(--accent)' : 'var(--purple)',
              color: '#fff',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {type}
            </span>
          </div>
          {address && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📍 {address}
            </p>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
          {timeAgo(modifiedTime)}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && (
            <span style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 20,
              background: `${statusColor(status)}20`,
              color: statusColor(status),
              fontWeight: 600,
            }}>
              {status}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{owner}</span>
        </div>
        {phone && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📱</span>
        )}
      </div>
    </div>
  );
}
