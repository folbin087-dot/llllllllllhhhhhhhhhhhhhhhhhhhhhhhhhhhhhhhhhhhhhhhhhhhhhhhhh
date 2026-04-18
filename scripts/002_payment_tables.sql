-- PostgreSQL Migration: Payment Tables for TON and SBP
-- Run this after 001_init_database.sql

-- =====================
-- TON PAYMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS ton_payments (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id VARCHAR(50) NOT NULL,
    ton_amount DECIMAL(20, 9) NOT NULL,
    rub_amount DECIMAL(15, 2) NOT NULL,
    memo VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'failed')),
    tx_hash VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ton_payments_telegram_id ON ton_payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ton_payments_status ON ton_payments(status);
CREATE INDEX IF NOT EXISTS idx_ton_payments_created_at ON ton_payments(created_at DESC);

-- =====================
-- SBP PAYMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS sbp_payments (
    order_id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'failed', 'refunded', 'cancelled')),
    invoice_id VARCHAR(100),
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sbp_payments_telegram_id ON sbp_payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sbp_payments_status ON sbp_payments(status);
CREATE INDEX IF NOT EXISTS idx_sbp_payments_created_at ON sbp_payments(created_at DESC);

-- =====================
-- Add default balance of 0 for new users
-- =====================
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0.00;

-- Update existing users with NULL balance to 0
UPDATE users SET balance = 0.00 WHERE balance IS NULL;

-- =====================
-- REFERRAL EARNINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deposit_amount DECIMAL(15, 2) NOT NULL,
    commission_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.05, -- 5%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_id ON referral_earnings(referred_id);
