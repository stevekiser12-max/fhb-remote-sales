'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  direction: 'Inbound' | 'Outbound';
  from: string;
  to: string;
  subject: string;
  creationTime: string;
}

export default function ConversationInner({ params }: { params: Promise<{ phone: string }> }) {
  const { phone: rawPhone } = use(params);
  const phone = decodeURIComponent(rawPhone);
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || phone;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/sms?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load messages');
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [phone]); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send');
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setText('');
      inputRef.current?.focus();
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
    }}>
      {/* Header */}
      <div style={{
        background: '#141414',
        borderBottom: '1px solid #2a2a2a',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: 24,
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600 }}>{name}</h1>
          <p style={{ fontSize: 12, color: '#888' }}>{phone}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scroll-container"
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            Loading messages...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#ef4444', marginBottom: 12 }}>{error}</p>
            {error.includes('RingCentral not connected') && (
              <button
                onClick={() => router.push('/settings')}
                className="action-btn"
                style={{ background: '#3b82f6', color: '#fff', margin: '0 auto' }}
              >
                Connect RingCentral →
              </button>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <p>No messages yet. Send one below!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.direction === 'Outbound' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              <div style={{
                padding: '10px 14px',
                borderRadius: msg.direction === 'Outbound'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                background: msg.direction === 'Outbound' ? '#3b82f6' : '#1e1e1e',
                color: '#fff',
                fontSize: 15,
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}>
                {msg.subject}
              </div>
              <div style={{
                fontSize: 11,
                color: '#888',
                marginTop: 4,
                textAlign: msg.direction === 'Outbound' ? 'right' : 'left',
                paddingLeft: 4,
                paddingRight: 4,
              }}>
                {formatTime(msg.creationTime)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{
        background: '#141414',
        borderTop: '1px solid #2a2a2a',
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            borderRadius: 24,
            padding: '10px 16px',
            fontSize: 15,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: text.trim() ? '#3b82f6' : '#1e1e1e',
            color: '#fff',
            fontSize: 18,
            cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {sending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
