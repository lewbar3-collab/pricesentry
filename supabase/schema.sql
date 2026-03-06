-- ============================================
-- PriceSentry Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors (belongs to a client)
CREATE TABLE competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  scrape_method TEXT NOT NULL DEFAULT 'fetch' CHECK (scrape_method IN ('fetch', 'playwright', 'proxy')),
  price_selector TEXT,
  needs_proxy BOOLEAN DEFAULT FALSE,
  check_frequency_hours INTEGER NOT NULL DEFAULT 6,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (belongs to a competitor)
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'error', 'paused')),
  last_scraped_at TIMESTAMPTZ,
  last_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history
CREATE TABLE price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  scrape_duration_ms INTEGER,
  error TEXT
);

-- Alert rules
CREATE TABLE alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'any_change' CHECK (trigger IN ('any_change', 'drops_by', 'rises_above', 'below_price', 'above_price')),
  threshold DECIMAL(10, 2),
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert logs (history of emails sent)
CREATE TABLE alert_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  old_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2) NOT NULL,
  change_percent DECIMAL(5, 2) NOT NULL,
  email_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape job log
CREATE TABLE scrape_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error')),
  price_found DECIMAL(10, 2),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Competitors: users manage own
CREATE POLICY "Users manage own competitors" ON competitors FOR ALL USING (auth.uid() = user_id);

-- Products: users manage own
CREATE POLICY "Users manage own products" ON products FOR ALL USING (auth.uid() = user_id);

-- Price history: users see own products' history
CREATE POLICY "Users view own price history" ON price_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = price_history.product_id AND products.user_id = auth.uid()));

-- Alert rules: users manage own
CREATE POLICY "Users manage own alert rules" ON alert_rules FOR ALL USING (auth.uid() = user_id);

-- Alert logs: users see own
CREATE POLICY "Users view own alert logs" ON alert_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM alert_rules WHERE alert_rules.id = alert_logs.alert_rule_id AND alert_rules.user_id = auth.uid()));

-- Scrape jobs: users see own
CREATE POLICY "Users view own scrape jobs" ON scrape_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = scrape_jobs.product_id AND products.user_id = auth.uid()));

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 
    CASE WHEN NEW.email = current_setting('app.admin_email', true) THEN 'admin' ELSE 'client' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_competitor_id ON products(competitor_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_price_history_scraped_at ON price_history(scraped_at DESC);
CREATE INDEX idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX idx_competitors_user_id ON competitors(user_id);
