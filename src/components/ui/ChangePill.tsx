interface ChangePillProps {
  oldPrice: number | null
  newPrice: number | null
}

export default function ChangePill({ oldPrice, newPrice }: ChangePillProps) {
  if (oldPrice === null || newPrice === null || oldPrice === newPrice) {
    return (
      <span className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
        — No change
      </span>
    )
  }

  const diff = newPrice - oldPrice
  const isUp = diff > 0

  return (
    <span
      className="font-mono"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        background: isUp ? 'var(--red-dim)' : 'var(--accent-dim)',
        color: isUp ? 'var(--red)' : 'var(--accent)',
        border: `1px solid ${isUp ? 'rgba(255,77,106,0.2)' : 'rgba(0,229,160,0.2)'}`,
      }}
    >
      {isUp ? '▲' : '▼'} £{Math.abs(diff).toFixed(2)}
    </span>
  )
}
