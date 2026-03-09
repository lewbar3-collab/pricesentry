export type UserRole = 'admin' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  role: UserRole
  plan: 'starter' | 'pro'
  created_at: string
}

export interface Competitor {
  id: string
  user_id: string
  name: string
  domain: string
  scrape_method: 'fetch' | 'playwright' | 'proxy'
  price_selector: string | null
  needs_proxy: boolean
  check_frequency_hours: number
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  competitor_id: string
  name: string
  url: string
  status: 'pending' | 'live' | 'error' | 'paused'
  last_scraped_at: string | null
  last_price: number | null
  category: string | null
  image_url: string | null
  created_at: string
  competitor?: Competitor
}

export interface PriceHistory {
  id: string
  product_id: string
  price: number
  scraped_at: string
  scrape_duration_ms: number | null
  error: string | null
}

export interface AlertRule {
  id: string
  user_id: string
  product_id: string
  trigger: 'any_change' | 'drops_by' | 'rises_above' | 'below_price' | 'above_price'
  threshold: number | null
  email: string
  is_active: boolean
  created_at: string
  product?: Product
}

export interface AlertLog {
  id: string
  alert_rule_id: string
  product_id: string
  old_price: number
  new_price: number
  change_amount: number
  change_percent: number
  email_sent: boolean
  sent_at: string
}

export interface ScrapeJob {
  id: string
  product_id: string
  status: 'pending' | 'running' | 'success' | 'error'
  price_found: number | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
  product?: Product
}

export interface DashboardStats {
  totalProducts: number
  liveProducts: number
  priceDrops: number
  priceRises: number
  alertsSent: number
}

export interface AdminStats {
  pendingSetup: number
  liveProducts: number
  totalClients: number
  scrapesToday: number
  successRate: number
}
