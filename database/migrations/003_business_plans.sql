-- =============================================================================
-- Migration: 003_business_plans.sql
-- SIH26091: UdyamSaarthi AI - Persistent Business Plan Management
-- =============================================================================

CREATE TABLE IF NOT EXISTS business_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entrepreneur_id UUID REFERENCES entrepreneurs(id) ON DELETE SET NULL,
    business_type VARCHAR(100) NOT NULL,
    plan_title VARCHAR(255) NOT NULL,
    plan_content JSONB NOT NULL DEFAULT '{}',
    financial_details JSONB NOT NULL DEFAULT '{}',
    capital DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    location JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_plans_user ON business_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_created ON business_plans(created_at DESC);
