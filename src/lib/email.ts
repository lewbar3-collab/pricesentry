import type { Product, AlertRule } from '@/types'

interface PriceChangeEmailProps {
  product: Product
  alertRule: AlertRule
  oldPrice: number
  newPrice: number
}

export async function sendPriceChangeAlert({
  product,
  alertRule,
  oldPrice,
  newPrice,
}: PriceChangeEmailProps) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const changeAmount = newPrice - oldPrice
  const changePercent = ((changeAmount / oldPrice) * 100).toFixed(1)
  const isIncrease = changeAmount > 0
  const direction = isIncrease ? '📈 Price Rise' : '📉 Price Drop'
  const colour = isIncrease ? '#ff4d6a' : '#00e5a0'
  const sign = isIncrease ? '+' : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#060810;font-family:'DM Sans',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);background:linear-gradient(135deg,rgba(0,229,160,0.06),transparent);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <div style="width:28px;height:28px;background:#00e5a0;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;">👁</div>
        <span style="font-size:16px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">PriceSentry</span>
      </div>
      <div style="font-size:11px;color:#5a6478;font-family:monospace;letter-spacing:0.05em;text-transform:uppercase;">Price Alert</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:13px;color:#8c95a8;margin-bottom:8px;">${direction}</div>
      <div style="font-size:24px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;margin-bottom:4px;">${product.name}</div>
      <div style="font-size:12px;font-family:monospace;color:#5a6478;margin-bottom:28px;">${(product as {url?: string}).url ?? ""}</div>
      <div style="background:#060810;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;text-align:center;">
          <div>
            <div style="font-size:11px;font-family:monospace;color:#5a6478;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Was</div>
            <div style="font-size:28px;font-weight:800;color:#8c95a8;letter-spacing:-1px;">£${oldPrice.toFixed(2)}</div>
          </div>
          <div style="font-size:20px;color:#5a6478;">→</div>
          <div>
            <div style="font-size:11px;font-family:monospace;color:#5a6478;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Now</div>
            <div style="font-size:28px;font-weight:800;color:${colour};letter-spacing:-1px;">£${newPrice.toFixed(2)}</div>
          </div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <span style="background:${colour}20;color:${colour};border:1px solid ${colour}40;font-family:monospace;font-size:13px;font-weight:500;padding:4px 12px;border-radius:20px;">
            ${sign}£${Math.abs(changeAmount).toFixed(2)} (${sign}${changePercent}%)
          </span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display:inline-block;background:#00e5a0;color:#060810;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          View Dashboard →
        </a>
      </div>
      <div style="font-size:11px;font-family:monospace;color:#5a6478;text-align:center;">
        You're receiving this because you set up a price alert on PriceSentry.<br>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts" style="color:#5a6478;">Manage alerts</a>
      </div>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: alertRule.email,
    subject: `${direction}: ${product.name} is now £${newPrice.toFixed(2)}`,
    html,
  })
}

export async function sendAdminNotification(subject: string, message: string) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.ADMIN_EMAIL!,
    subject: `[PriceSentry Admin] ${subject}`,
    html: `<pre style="font-family:monospace;font-size:13px;">${message}</pre>`,
  })
}
