type Status = 'pending' | 'live' | 'error' | 'paused' | 'configuring'

interface StatusPillProps {
  status: Status
}

const config: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  pending: { label: 'Pending', bg: 'var(--amber-dim)', color: 'var(--amber)', border: 'rgba(255,184,63,0.2)' },
  live: { label: 'Live', bg: 'var(--accent-dim)', color: 'var(--accent)', border: 'rgba(0,229,160,0.2)' },
  error: { label: 'Error', bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(255,77,106,0.2)' },
  paused: { label: 'Paused', bg: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: 'var(--border)' },
  configuring: { label: 'Configuring', bg: 'var(--purple-dim)', color: 'var(--purple)', border: 'rgba(167,139,250,0.2)' },
}

export default function StatusPill({ status }: StatusPillProps) {
  const c = config[status]
  return (
    <span
      className="font-mono"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      ● {c.label}
    </span>
  )
}
