interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'green' | 'red' | 'amber' | 'blue' | 'purple'
  delay?: number
}

const colorMap = {
  green: 'var(--accent)',
  red: 'var(--red)',
  amber: 'var(--amber)',
  blue: 'var(--blue)',
  purple: 'var(--purple)',
}

export default function StatCard({ label, value, sub, color = 'green', delay = 0 }: StatCardProps) {
  const c = colorMap[color]

  return (
    <div
      className="animate-fade-up"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 11,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${delay}s`,
      }}
    >
      {/* Glow */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: c, filter: 'blur(25px)', opacity: 0.2 }} />

      <div className="font-mono" style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-1px', lineHeight: 1, marginBottom: 6, color: c }}>
        {value}
      </div>
      {sub && (
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  )
}
