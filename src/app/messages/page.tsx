'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface InboxConvo {
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  name: string;
  leadId: string;
  leadType: string;
  unreadCount: number;
}

type FilterTab = 'all' | 'lead' | 'contact';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<InboxConvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [rcConnected, setRcConnected] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        setRcConnected(data.rcConnected);
        if (data.rcConnected) {
          fetchInbox();
        } else {
          setLoading(false);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sms/inbox');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error('Inbox fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rcConnected) return;
    const interval = setInterval(fetchInbox, 30000);
    return () => clearInterval(interval);
  }, [rcConnected]);

  const filtered = conversations.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'lead') return c.leadType === 'lead' || !c.leadType;
    if (filter === 'contact') return c.leadType === 'contact';
    return true;
  });

  const leadCount = conversations.filter(c => c.leadType === 'lead' || !c.leadType).length;
  const contactCount = conversations.filter(c => c.leadType === 'contact').length;

  if (rcConnected === null) {
    return (
      <div style={{ padding: 16, paddingBottom: 100 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
        <BottomNav />
      </div>
    );
  }

  if (!rcConnected) {
    return (
      <div style={{ paddingBottom: 100 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2a' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>💬 Needs Reply</h1>
        </div>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Connect RingCentral</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Connect your RingCentral account to see texts that need a reply.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="action-btn"
            style={{ background: '#3b82f6', color: '#fff', margin: '0 auto', padding: '12px 24px' }}
          >
            Go to Settings →
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 50,
        borderBottom: '1px solid #2a2a2a',
      }}>
        <div style={{
          padding: '16px 16px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>💬 Needs Reply</h1>
            <p style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} waiting
            </p>
          </div>
          <button
            onClick={fetchInbox}
            disabled={loading}
            style={{
              background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8,
              color: '#888', fontSize: 13, padding: '6px 12px', cursor: 'pointer',
            }}
          >
            {loading ? '...' : '↻'}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 16px 12px',
        }}>
          {([
            { key: 'all' as FilterTab, label: 'All', count: conversations.length },
            { key: 'lead' as FilterTab, label: 'Leads', count: leadCount },
            { key: 'contact' as FilterTab, label: 'Contacts', count: contactCount },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                borderBottom: filter === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                color: filter === tab.key ? '#3b82f6' : '#888',
                background: 'transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ padding: '8px 16px' }}>
        {loading && conversations.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: 8 }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
            <p style={{ fontSize: 13 }}>
              {filter === 'all'
                ? 'No texts waiting for a reply'
                : `No ${filter} texts waiting for a reply`}
            </p>
          </div>
        ) : (
          filtered.map(convo => (
            <div
              key={convo.phone}
              onClick={() => {
                const nameParam = convo.name ? `&name=${encodeURIComponent(convo.name)}` : '';
                router.push(`/messages/${encodeURIComponent(convo.phone)}?${nameParam}`);
              }}
              style={{
                background: '#141414',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 8,
                border: '1px solid #2a2a2a',
                cursor: 'pointer',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {/* Avatar / type badge */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: convo.leadType === 'contact' ? '#22c55e20' : '#f9731620',
                display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, position: 'relative',
              }}>
                {convo.leadType === 'contact' ? '👤' : '💬'}
                {convo.unreadCount > 1 && (
                  <div style={{
                    position: 'absolute', top: -2, right: -2,
                    background: '#ef4444', color: '#fff',
                    borderRadius: '50%', width: 18, height: 18,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {convo.unreadCount}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{
                    fontWeight: 600, fontSize: 15,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 50px)',
                  }}>
                    {convo.name || convo.phone}
                  </span>
                  <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginLeft: 8 }}>
                    {timeAgo(convo.lastMessageTime)}
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: '#888',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  margin: 0,
                }}>
                  {convo.lastMessage}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {convo.name && (
                    <span style={{ fontSize: 11, color: '#555' }}>{convo.phone}</span>
                  )}
                  {convo.leadType && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      padding: '1px 5px', borderRadius: 4,
                      background: convo.leadType === 'contact' ? '#22c55e20' : '#3b82f620',
                      color: convo.leadType === 'contact' ? '#22c55e' : '#3b82f6',
                    }}>
                      {convo.leadType}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <span style={{ color: '#444', fontSize: 16, flexShrink: 0 }}>›</span>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
