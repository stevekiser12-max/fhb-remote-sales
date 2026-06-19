'use client';

// Clean property card using data we already have from Zoho
// Opens Zillow on tap — no API/scraping needed

interface Props {
  address: string;
  zillow: string;
}

export default function ZillowPreview({ address, zillow }: Props) {
  if (!address) return null;

  const handleOpen = () => {
    if (zillow) window.open(zillow, '_blank');
  };

  // Parse address parts for display
  const parts = address.split(',').map(s => s.trim());
  const street = parts[0] || '';
  const cityStateZip = parts.slice(1).join(', ');

  return (
    <div
      onClick={handleOpen}
      style={{
        background: '#141414',
        borderRadius: 14,
        border: '1px solid #2a2a2a',
        padding: '14px 16px',
        cursor: zillow ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Map pin icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: '#006AFF15', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        🏠
      </div>

      {/* Address info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 15, fontWeight: 600, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {street}
        </p>
        {cityStateZip && (
          <p style={{ fontSize: 13, color: '#888' }}>{cityStateZip}</p>
        )}
      </div>

      {/* Zillow button */}
      {zillow && (
        <div style={{
          background: '#006AFF',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: 0.3,
        }}>
          Zillow →
        </div>
      )}
    </div>
  );
}
