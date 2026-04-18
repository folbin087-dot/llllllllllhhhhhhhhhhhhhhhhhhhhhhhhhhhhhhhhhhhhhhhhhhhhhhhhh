-- Partner/Affiliate System Tables
-- Ensures profitability: partners earn commission ONLY from player losses

-- Add premium partner flag to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium_partner BOOLEAN DEFAULT FALSE;

-- Partner earnings tracking table
CREATE TABLE IF NOT EXISTS partner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES users(id),
  referral_id UUID REFERENCES users(id),  -- Which referral generated this earning
  amount DECIMAL(12, 2) NOT NULL,
  source_losses DECIMAL(12, 2) DEFAULT 0,  -- Losses that generated this commission
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON partner_earnings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_status ON partner_earnings(status);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_created ON partner_earnings(created_at);

-- Partner applications for premium status
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  total_referrals INT DEFAULT 0,
  total_volume DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);

-- Partner link clicks tracking (for conversion analytics)
CREATE TABLE IF NOT EXISTS partner_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES users(id),
  referral_code VARCHAR(20) NOT NULL,
  ip_hash VARCHAR(64),  -- Hashed IP for unique click tracking
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner ON partner_clicks(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_created ON partner_clicks(created_at);

-- Function to calculate and record partner earnings from game losses
-- This is called after each losing bet to track partner commissions
CREATE OR REPLACE FUNCTION calculate_partner_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_is_premium BOOLEAN;
  v_commission_rate DECIMAL(4,3);
  v_commission DECIMAL(12,2);
BEGIN
  -- Only process losing bets (where amount is negative and type is 'bet')
  IF NEW.type = 'bet' AND NEW.amount < 0 THEN
    -- Find the partner who referred this user
    SELECT referred_by INTO v_partner_id FROM users WHERE id = NEW.user_id;
    
    IF v_partner_id IS NOT NULL THEN
      -- Check if partner is premium
      SELECT COALESCE(is_premium_partner, FALSE) INTO v_is_premium 
      FROM users WHERE id = v_partner_id;
      
      -- Set commission rate (5% standard, 8% premium)
      v_commission_rate := CASE WHEN v_is_premium THEN 0.08 ELSE 0.05 END;
      
      -- Calculate commission from the loss (amount is negative, so negate it)
      v_commission := ABS(NEW.amount) * v_commission_rate;
      
      -- Only record if commission is meaningful
      IF v_commission >= 0.01 THEN
        INSERT INTO partner_earnings (partner_id, referral_id, amount, source_losses, status)
        VALUES (v_partner_id, NEW.user_id, v_commission, ABS(NEW.amount), 'pending');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_partner_commission ON transactions;
CREATE TRIGGER trigger_partner_commission
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_partner_commission();

-- View for partner dashboard stats
CREATE OR REPLACE VIEW partner_stats AS
SELECT 
  p.id as partner_id,
  p.telegram_id,
  p.referral_code,
  p.is_premium_partner,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.last_activity > NOW() - INTERVAL '7 days' THEN r.id END) as active_referrals,
  COALESCE(SUM(r.total_wagered), 0) as total_referral_wagered,
  COALESCE(SUM(r.total_wagered - r.total_won), 0) as total_referral_losses,
  COALESCE((SELECT SUM(amount) FROM partner_earnings WHERE partner_id = p.id AND status = 'paid'), 0) as total_paid,
  COALESCE((SELECT SUM(amount) FROM partner_earnings WHERE partner_id = p.id AND status = 'pending'), 0) as pending_earnings
FROM users p
LEFT JOIN users r ON r.referred_by = p.id
GROUP BY p.id, p.telegram_id, p.referral_code, p.is_premium_partner;
