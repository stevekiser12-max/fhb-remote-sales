'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import ZillowPreview from '@/components/ZillowPreview';

interface LeadRecord {
  id: string;
  type: 'lead' | 'contact';
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  status: string;
  owner: string;
  notes: string;
  zillow: string;
  createdTime: string;
  modifiedTime: string;
}

interface BlueprintField {
  apiName: string;
  displayLabel: string;
  dataType: string;
  required: boolean;
  pickListValues?: { displayValue: string; actualValue: string }[];
}

interface BlueprintTransition {
  id: string;
  name: string;
  nextFieldValue: string;
  type: string;
  colorCode: string;
  fields: BlueprintField[];
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('not contacted') || s.includes('new')) return '#3b82f6';
  if (s.includes('attempted') || s.includes('contacted')) return '#f59e0b';
  if (s.includes('qualified') || s.includes('interested')) return '#22c55e';
  if (s.includes('unqualified') || s.includes('lost') || s.includes('junk')) return '#ef4444';
  if (s.includes('converted')) return '#a855f7';
  if (s.includes('nurture')) return '#6366f1';
  if (s.includes('incoming') || s.includes('needs reply')) return '#f97316';
  return '#888';
}

export default function LeadDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as 'lead' | 'contact') || 'lead';
  const router = useRouter();

  const [record, setRecord] = useState<LeadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState('');

  // Blueprint
  const [transitions, setTransitions] = useState<BlueprintTransition[]>([]);
  const [activeTransition, setActiveTransition] = useState<BlueprintTransition | null>(null);
  const [transitionData, setTransitionData] = useState<Record<string, string>>({});
  const [executingTransition, setExecutingTransition] = useState(false);

  useEffect(() => {
    fetch(`/api/leads/${id}?module=${type === 'contact' ? 'contacts' : 'leads'}`)
      .then(r => r.json())
      .then(data => {
        setRecord(data);
        // Pre-fill the notes field with existing notes
        if (data.notes) setNoteText(data.notes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch blueprint transitions
    fetch(`/api/leads/${id}/blueprint?module=${type === 'contact' ? 'contacts' : 'leads'}`)
      .then(r => r.json())
      .then(data => setTransitions(data.transitions || []))
      .catch(console.error);
  }, [id, type]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleCall = () => {
    const phone = record?.phone || record?.mobile;
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleText = () => {
    const phone = record?.phone || record?.mobile;
    if (phone) router.push(`/messages/${encodeURIComponent(phone)}?name=${encodeURIComponent(record?.fullName || '')}`);
  };

  const handleZillow = () => {
    if (record?.zillow) window.open(record.zillow, '_blank');
  };

  const handleSaveNotes = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_note',
          module: type === 'contact' ? 'contacts' : 'leads',
          content: noteText,
        }),
      });
      showToast('✅ Notes saved');
    } catch {
      showToast('❌ Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleTransitionClick = (transition: BlueprintTransition) => {
    if (transition.fields.length > 0) {
      // Has required fields — show form
      setActiveTransition(transition);
      setTransitionData({});
    } else {
      // No fields required — execute directly
      executeTransitionNow(transition.id, {});
    }
  };

  const executeTransitionNow = async (transitionId: string, data: Record<string, unknown>) => {
    setExecutingTransition(true);
    try {
      const res = await fetch(`/api/leads/${id}/blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transitionId,
          module: type === 'contact' ? 'contacts' : 'leads',
          data,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(`❌ ${err.error || 'Transition failed'}`);
        return;
      }

      const transition = transitions.find(t => t.id === transitionId);
      showToast(`✅ → ${transition?.nextFieldValue || 'Updated'}`);
      setActiveTransition(null);

      // Refresh record and transitions
      const recordRes = await fetch(`/api/leads/${id}?module=${type === 'contact' ? 'contacts' : 'leads'}`);
      const newRecord = await recordRes.json();
      setRecord(newRecord);

      const bpRes = await fetch(`/api/leads/${id}/blueprint?module=${type === 'contact' ? 'contacts' : 'leads'}`);
      const bpData = await bpRes.json();
      setTransitions(bpData.transitions || []);
    } catch {
      showToast('❌ Failed to execute transition');
    } finally {
      setExecutingTransition(false);
    }
  };

  const handleConvert = async () => {
    if (!record || converting) return;
    if (!confirm('Convert this lead to a contact?')) return;
    setConverting(true);
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      });
      showToast('✅ Lead converted to Contact!');
      setTimeout(() => router.push('/'), 1500);
    } catch {
      showToast('❌ Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16, paddingBottom: 100 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        <BottomNav />
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Record not found</p>
        <BottomNav />
      </div>
    );
  }

  const phone = record.phone || record.mobile;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1e1e1e', border: '1px solid #2a2a2a', padding: '10px 20px',
          borderRadius: 10, fontSize: 14, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Transition Modal */}
      {activeTransition && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 150,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
          onClick={() => setActiveTransition(null)}
        >
          <div
            style={{
              background: '#141414', borderRadius: '16px 16px 0 0', padding: 20,
              width: '100%', maxWidth: 500, maxHeight: '70vh', overflowY: 'auto',
              border: '1px solid #2a2a2a', borderBottom: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              {activeTransition.name}
            </h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              → {activeTransition.nextFieldValue}
            </p>

            {activeTransition.fields
              .filter(f => f.dataType === 'picklist' && f.pickListValues && f.pickListValues.length > 0)
              .map(field => (
                <div key={field.apiName} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                    {field.displayLabel}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {field.pickListValues!.map(v => (
                      <button
                        key={v.actualValue}
                        onClick={() => setTransitionData(prev => ({ ...prev, [field.apiName]: v.actualValue }))}
                        style={{
                          padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                          cursor: 'pointer',
                          border: transitionData[field.apiName] === v.actualValue
                            ? '2px solid #3b82f6' : '1px solid #2a2a2a',
                          background: transitionData[field.apiName] === v.actualValue
                            ? '#3b82f620' : '#1e1e1e',
                          color: transitionData[field.apiName] === v.actualValue
                            ? '#3b82f6' : '#ccc',
                        }}
                      >
                        {v.displayValue}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            <button
              onClick={() => executeTransitionNow(activeTransition.id, transitionData)}
              disabled={executingTransition}
              className="action-btn"
              style={{
                width: '100%', marginTop: 8,
                background: activeTransition.colorCode || '#3b82f6',
                color: '#fff', fontSize: 16, padding: 14,
              }}
            >
              {executingTransition ? 'Processing...' : `Move to ${activeTransition.nextFieldValue}`}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 50,
        padding: '16px', borderBottom: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: '#3b82f6', fontSize: 24, cursor: 'pointer', padding: '0 4px',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>{record.fullName}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: type === 'lead' ? '#3b82f620' : '#a855f720',
              color: type === 'lead' ? '#3b82f6' : '#a855f7',
              fontWeight: 600, textTransform: 'uppercase',
            }}>{type}</span>
            {record.status && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: `${statusColor(record.status)}20`,
                color: statusColor(record.status), fontWeight: 600,
              }}>{record.status}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={handleCall} disabled={!phone} className="action-btn"
            style={{ background: phone ? '#22c55e' : '#1e1e1e', color: phone ? '#fff' : '#888', padding: '14px 16px' }}>
            📞 Call
          </button>
          <button onClick={handleText} disabled={!phone} className="action-btn"
            style={{ background: phone ? '#3b82f6' : '#1e1e1e', color: phone ? '#fff' : '#888', padding: '14px 16px' }}>
            💬 Text
          </button>
        </div>

        {/* Blueprint Transitions */}
        {transitions.length > 0 && (
          <div style={{
            background: '#141414', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a',
          }}>
            <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 10, display: 'block' }}>
              Move in Pipeline
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {transitions.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTransitionClick(t)}
                  disabled={executingTransition}
                  style={{
                    padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', border: `2px solid ${t.colorCode || '#3b82f6'}`,
                    background: `${t.colorCode || '#3b82f6'}15`,
                    color: t.colorCode || '#3b82f6',
                    transition: 'all 0.15s',
                  }}
                >
                  → {t.nextFieldValue}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zillow Property Preview */}
        {record.address && <ZillowPreview address={record.address} zillow={record.zillow} />}

        {/* Info Card */}
        <div style={{ background: '#141414', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          {record.address && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Address</label>
              <p style={{ fontSize: 15, marginTop: 2 }}>📍 {record.address}</p>
            </div>
          )}
          {phone && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Phone</label>
              <p style={{ fontSize: 15, marginTop: 2 }}>{phone}</p>
            </div>
          )}
          {record.email && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Email</label>
              <p style={{ fontSize: 15, marginTop: 2 }}>{record.email}</p>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Owner</label>
            <p style={{ fontSize: 15, marginTop: 2 }}>{record.owner}</p>
          </div>
        </div>

        {/* Notes — editable Description field */}
        <div style={{ background: '#141414', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
          <label style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
            Lead Notes
          </label>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Type notes here..."
            style={{ marginBottom: 10, minHeight: 100 }}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="action-btn"
            style={{
              width: '100%',
              background: '#3b82f6',
              color: '#fff',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Notes'}
          </button>
        </div>

        {/* Convert Lead */}
        {type === 'lead' && (
          <button onClick={handleConvert} disabled={converting} className="action-btn"
            style={{
              width: '100%', background: '#a855f720', color: '#a855f7',
              border: '2px solid #a855f740', fontSize: 16, padding: 16,
            }}>
            {converting ? 'Converting...' : '🔄 Convert to Contact'}
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
