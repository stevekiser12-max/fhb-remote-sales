'use client';

import { useEffect, useState, useCallback } from 'react';
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
}

interface DashboardCounts {
  newLead: number;
  newNoContact: number;
  needsReply: number;
  followUp: number;
  contacted: number;
  qualified: number;
}

type ViewMode = 'dashboard' | 'leads' | 'contacts';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: '✨ New', value: 'New Lead' },
  { label: '🔴 No Contact', value: 'New No Contact' },
  { label: '💬 Needs Reply', value: 'Incoming - Needs Reply' },
  { label: '📞 Contacted', value: 'Contacted' },
  { label: '📋 Follow-up', value: 'Follow-up' },
  { label: '✅ Qualified', value: 'Qualified' },
  { label: '🔄 Resurected', value: 'Ressurected' },
  { label: '🕐 Nurture', value: 'Long Term Nurture' },
  { label: '⏸️ Stale', value: 'Stale' },
];

export default function HomePage() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [records, setRecords] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [urgentLeads, setUrgentLeads] = useState<LeadRecord[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const router = useRouter();

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => setUser(data))
      .catch(() => router.push('/login'));
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user) return;
    setCountsLoading(true);
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        setCounts(data.counts);
        setUrgentLeads(data.urgent || []);
      })
      .catch(console.error)
      .finally(() => setCountsLoading(false));
  }, [user]);

  const fetchRecords = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    setLoading(true);
    try {
      const tab = view === 'contacts' ? 'contacts' : 'leads';
      const params = new URLSearchParams({ tab, page: String(p) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (reset) {
        setRecords(data.records);
        setPage(1);
      } else {
        setRecords(prev => [...prev, ...data.records]);
      }
      setHasMore(data.hasMore);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [view, page, search, statusFilter]);

  // Fetch records when switching to list views
  useEffect(() => {
    if (user && view !== 'dashboard') fetchRecords(true);
  }, [view, statusFilter, user]); // eslint-disable-line

  // Search debounce
  useEffect(() => {
    if (!user || view === 'dashboard') return;
    const timer = setTimeout(() => fetchRecords(true), 400);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line

  // Load more
  useEffect(() => {
    if (page > 1 && user && view !== 'dashboard') fetchRecords(false);
  }, [page]); // eslint-disable-line

  const handleDashboardTap = (status: string) => {
    setView('leads');
    setStatusFilter(status);
    setSearch('');
  };

  if (!user) return null;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 50,
        padding: '16px 16px 12px', borderBottom: '1px solid #2a2a2a',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {view === 'dashboard' ? `👋 ${user.name}` : view === 'leads' ? '📋 Leads' : '👥 Contacts'}
          </h1>
          {view !== 'dashboard' && (
            <button
              onClick={() => { setView('dashboard'); setStatusFilter(''); setSearch(''); }}
              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Dashboard
            </button>
          )}
        </div>

        {/* View tabs — only show when not on dashboard */}
        {view !== 'dashboard' && (
          <>
            {/* Search */}
            <input
              type="text"
              placeholder="Search name, phone, or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 10, fontSize: 15, padding: '10px 14px' }}
            />

            {/* Module tabs */}
            <div style={{ display: 'flex', gap: 0, background: '#141414', borderRadius: 10, padding: 3, marginBottom: 10 }}>
              {(['leads', 'contacts'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setView(t); setStatusFilter(''); setSearch(''); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                    background: view === t ? '#3b82f6' : 'transparent',
                    color: view === t ? '#fff' : '#888',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {t === 'leads' ? '📋 Leads' : '👥 Contacts'}
                </button>
              ))}
            </div>

            {/* Status filters — only for leads */}
            {view === 'leads' && (
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
              }}>
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      border: statusFilter === f.value ? '2px solid #3b82f6' : '1px solid #2a2a2a',
                      background: statusFilter === f.value ? '#3b82f620' : '#141414',
                      color: statusFilter === f.value ? '#3b82f6' : '#888',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick actions — top */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => { setView('leads'); setStatusFilter(''); }}
              className="action-btn"
              style={{ background: '#141414', color: '#f5f5f5', border: '1px solid #2a2a2a', padding: 16 }}
            >
              📋 All Leads
            </button>
            <button
              onClick={() => { setView('contacts'); setStatusFilter(''); }}
              className="action-btn"
              style={{ background: '#141414', color: '#f5f5f5', border: '1px solid #2a2a2a', padding: 16 }}
            >
              👥 All Contacts
            </button>
          </div>

          {/* Count Cards */}
          {countsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
            </div>
          ) : counts && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DashCard
                emoji="✨" label="New" count={counts.newLead}
                color="#a855f7" onClick={() => handleDashboardTap('New Lead')}
              />
              <DashCard
                emoji="🔴" label="New No Contact" count={counts.newNoContact}
                color="#ef4444" onClick={() => router.push('/new-no-contact')}
              />
              <DashCard
                emoji="💬" label="Needs Reply" count={counts.needsReply}
                color="#f97316" onClick={() => handleDashboardTap('Incoming - Needs Reply')}
              />
              <DashCard
                emoji="📋" label="Follow-up" count={counts.followUp}
                color="#3b82f6" onClick={() => handleDashboardTap('Follow-up')}
              />
              <DashCard
                emoji="📞" label="Contacted" count={counts.contacted}
                color="#f59e0b" onClick={() => handleDashboardTap('Contacted')}
              />
              <DashCard
                emoji="✅" label="Qualified" count={counts.qualified}
                color="#22c55e" onClick={() => handleDashboardTap('Qualified')}
              />
            </div>
          )}

          {/* Urgent / Needs Action List */}
          {urgentLeads.length > 0 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: '#f5f5f5' }}>
                ⚡ Needs Action
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {urgentLeads.map(record => (
                  <LeadCard key={`${record.type}-${record.id}`} {...record} />
                ))}
              </div>
            </div>
          )}


        </div>
      )}

      {/* List View */}
      {view !== 'dashboard' && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && records.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />
            ))
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
              <p>No {view} found{statusFilter ? ` with status "${statusFilter}"` : ''}</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#888', paddingLeft: 4 }}>
                {records.length} record{records.length !== 1 ? 's' : ''}
                {statusFilter ? ` · ${statusFilter}` : ''}
              </div>
              {records.map(record => (
                <LeadCard key={`${record.type}-${record.id}`} {...record} />
              ))}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  style={{
                    padding: '12px', borderRadius: 10, border: '1px solid #2a2a2a',
                    background: '#141414', color: '#888', fontSize: 14, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// Dashboard count card component
function DashCard({ emoji, label, count, color, onClick }: {
  emoji: string; label: string; count: number; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#141414', borderRadius: 14, padding: '14px 16px',
        border: `1px solid ${count > 0 ? color + '40' : '#2a2a2a'}`,
        cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'transform 0.1s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{
          fontSize: 24, fontWeight: 700, color: count > 0 ? color : '#444',
        }}>
          {count}
        </span>
      </div>
      <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</span>
    </button>
  );
}

