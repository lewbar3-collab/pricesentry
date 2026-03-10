import type { AlertRule } from '@/types'

interface PriceChangeEmailProps {
  competitorName: string
  competitorDomain: string
  productName: string
  productCategory: string | null
  productImageUrl: string | null
  alertRule: AlertRule
  oldPrice: number
  newPrice: number
}

export async function sendPriceChangeAlert({
  competitorName,
  competitorDomain,
  productName,
  productCategory,
  alertRule,
  oldPrice,
  newPrice,
}: PriceChangeEmailProps) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const changeAmount  = newPrice - oldPrice
  const changePercent = ((changeAmount / oldPrice) * 100).toFixed(1)
  const isIncrease    = changeAmount > 0
  const accentColour  = isIncrease ? '#ff4d6a' : '#00e5a0'
  const accentDim     = isIncrease ? 'rgba(255,77,106,0.12)' : 'rgba(0,229,160,0.12)'
  const accentBorder  = isIncrease ? 'rgba(255,77,106,0.25)' : 'rgba(0,229,160,0.25)'
  const directionWord = isIncrease ? 'Price Rise' : 'Price Drop'
  const arrow         = isIncrease ? '▲' : '▼'
  const sign          = isIncrease ? '+' : ''
  const dashUrl       = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products`

  // Mini sparkline bars — just decorative dividers to suggest a chart
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 4 + Math.round(Math.abs(Math.sin(i * 1.7 + 0.4) * 20))
    const isLast = i === 27
    const col = isLast ? accentColour : 'rgba(255,255,255,0.07)'
    return `<div style="display:inline-block;width:6px;height:${h}px;background:${col};border-radius:2px 2px 0 0;margin-right:3px;vertical-align:bottom;"></div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${directionWord}: ${productName}</title>
</head>
<body style="margin:0;padding:0;background:#060810;font-family:'DM Sans',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <div style="max-width:560px;margin:40px auto;padding:0 16px;">

    <!-- Card -->
    <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

      <!-- Header -->
      <div style="padding:24px 28px 20px;background:linear-gradient(135deg,rgba(0,229,160,0.07) 0%,transparent 60%);border-bottom:1px solid rgba(255,255,255,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:32px;height:32px;background:linear-gradient(135deg,#00E5FF,#0080FF);border-radius:8px;text-align:center;vertical-align:middle;font-family:monospace;font-size:13px;font-weight:800;color:#080C14;">PS</td>
                  <td style="padding-left:10px;font-size:17px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;">PriceSentry</td>
                </tr>
              </table>
              <div style="margin-top:6px;font-size:10px;color:#4a5568;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase;">Competitor Price Alert</div>
            </td>
            <td style="text-align:right;vertical-align:top;">
              <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:10px;font-family:monospace;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;background:${accentDim};color:${accentColour};border:1px solid ${accentBorder};">
                ${arrow} ${directionWord}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body -->
      <div style="padding:28px;">

        <!-- Competitor badge -->
        <div style="margin-bottom:16px;">
          <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="width:26px;height:26px;background:linear-gradient(135deg,#4d9fff,#a78bfa);border-radius:6px;text-align:center;vertical-align:middle;font-size:10px;font-weight:800;color:#fff;font-family:monospace;">
                ${competitorName.slice(0, 2).toUpperCase()}
              </td>
              <td style="padding-left:9px;">
                <div style="font-size:13px;font-weight:600;color:#e2e8f0;">${competitorName}</div>
                <div style="font-size:10px;font-family:monospace;color:#4a5568;">${competitorDomain}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Product name -->
        <div style="font-size:22px;font-weight:800;color:#f0f4ff;letter-spacing:-0.5px;margin-bottom:4px;line-height:1.2;">${productName}</div>
        ${productCategory ? `<div style="display:inline-block;padding:2px 8px;border-radius:5px;font-size:10px;font-family:monospace;color:#8b7cf8;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.2);margin-bottom:20px;">${productCategory}</div>` : '<div style="margin-bottom:20px;"></div>'}

        <!-- Price comparison box -->
        <div style="background:#060810;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;margin-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="text-align:center;width:40%;">
                <div style="font-size:10px;font-family:monospace;color:#4a5568;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Was</div>
                <div style="font-size:30px;font-weight:800;color:#5a6478;letter-spacing:-1px;text-decoration:line-through;">£${oldPrice.toFixed(2)}</div>
              </td>
              <td style="text-align:center;width:20%;color:#3a4458;font-size:18px;">→</td>
              <td style="text-align:center;width:40%;">
                <div style="font-size:10px;font-family:monospace;color:#4a5568;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Now</div>
                <div style="font-size:30px;font-weight:800;color:${accentColour};letter-spacing:-1px;">£${newPrice.toFixed(2)}</div>
              </td>
            </tr>
          </table>
          <!-- Change pill -->
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <span style="display:inline-block;background:${accentDim};color:${accentColour};border:1px solid ${accentBorder};font-family:monospace;font-size:13px;font-weight:700;padding:5px 16px;border-radius:20px;">
              ${arrow} ${sign}£${Math.abs(changeAmount).toFixed(2)} &nbsp;·&nbsp; ${sign}${changePercent}%
            </span>
          </div>
        </div>

        <!-- Sparkline decoration -->
        <div style="padding:10px 0 16px;text-align:center;line-height:0;">
          ${bars}
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${dashUrl}" style="display:inline-block;background:#00e5a0;color:#060810;font-weight:700;font-size:13px;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.2px;">
            View Products &amp; Alerts →
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;text-align:center;">
          <div style="font-size:11px;font-family:monospace;color:#3a4458;line-height:1.7;">
            Alert triggered by rule: <span style="color:#5a6478;">${alertRule.trigger.replace(/_/g, ' ')}${alertRule.threshold ? ` £${alertRule.threshold}` : ''}</span><br>
            Sent to ${alertRule.email}<br>
            <a href="${dashUrl}" style="color:#4a5568;text-decoration:underline;">Manage alerts on PriceSentry</a>
          </div>
        </div>

      </div>
    </div>

    <!-- Outside footer -->
    <div style="text-align:center;padding:20px 0;font-size:10px;font-family:monospace;color:#2a3448;letter-spacing:0.04em;">
      PRICESENTRY · COMPETITOR PRICE MONITORING
    </div>

  </div>
</body>
</html>`

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: alertRule.email,
    subject: `${arrow} ${competitorName}: ${productName} is now £${newPrice.toFixed(2)} (${sign}£${Math.abs(changeAmount).toFixed(2)})`,
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
    html: `<pre style="font-family:monospace;font-size:13px;background:#060810;color:#00e5a0;padding:20px;border-radius:8px;">${message}</pre>`,
  })
}
