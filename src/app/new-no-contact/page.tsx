'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import LeadCard from '@/components/LeadCard';

interface LeadRecord {
  id: string;
  type: 'lead' | 'contact';
  fullName: string;
  address: string;
  status: string;
  owner: string;
  phone: string;
  mobile: string;
  modifiedTime: string;
  createdTime: string;
}

interface Breakdown {
  total: number;
  within7d: number;
  within14d: number;
  within30d: number;
  over30d: number;
  records: LeadRecord[];
}

type AgeFilter = 'all' | '7d' | '14d' | '30d' | '30plus';

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function NewNoContactPage() {
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AgeFilter>('all');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error(); })
      .catch(() => router.push('/login'));

    fetch('/api/dashboard/new-no-contact')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filteredRecords = data?.records.filter(r => {
    if (filter === 'all') return true;
    const days = daysAgo(r.createdTime);
    if (filter === '7d') return days <= 7;
    if (filter === '14d') return days > 7 && days <= 14;
    if (filter === '30d') return days > 14 && days <= 30;
    if (filter === '30plus') return days > 30;
    return true;
  }) || [];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 50,
        padding: '16px', borderBottom: '1px solid #2a2a2a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 24, cursor: 'pointer', padding: '0 4px' }}
          >←</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔴 New No Contact</h1>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {data?.total || 0} total leads
            </p>
          </div>
        </div>

        {/* Age breakdown cards */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {([
              { key: '7d' as AgeFilter, label: '< 7d', count: data.within7d, color: '#22c55e' },
              { key: '14d' as AgeFilter, label: '7-14d', count: data.within14d, color: '#f59e0b' },
              { key: '30d' as AgeFilter, label: '14-30d', count: data.within30d, color: '#f97316' },
              { key: '30plus' as AgeFilter, label: '30d+', count: data.over30d, color: '#ef4444' },
            ]).map(b => (
              <button
                key={b.key}
                onClick={() => setFilter(filter === b.key ? 'all' : b.key)}
                style={{
                  background: filter === b.key ? `${b.color}20` : '#141414',
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                  border: filter === b.key ? `2px solid ${b.color}` : '1px solid #2a2a2a',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: b.count > 0 ? b.color : '#444' }}>
                  {b.count}
                </div>
                <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginTop: 2 }}>
                  {b.label}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Show all button */}
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            style={{
              background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8,
              color: '#3b82f6', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer',
              width: '100%',
            }}
          >
            Show all ({data?.total})
          </button>
        )}
      </div>

      {/* Lead list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
          ))
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <p>No leads in this bucket</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#888', paddingLeft: 4 }}>
              {filteredRecords.length} lead{filteredRecords.length !== 1 ? 's' : ''}
              {filter !== 'all' ? ` · ${filter === '30plus' ? '30d+' : filter}` : ''}
            </div>
            {filteredRecords.map(record => (
              <LeadCard key={record.id} {...record} />
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
