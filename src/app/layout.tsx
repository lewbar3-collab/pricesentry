import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PriceSentry — Competitor Price Intelligence',
  description: 'Monitor competitor prices and get alerted when they change.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
