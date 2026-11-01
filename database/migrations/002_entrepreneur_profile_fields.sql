-- Migration: 002_entrepreneur_profile_fields.sql
-- Add UI profile fields to entrepreneurs table and ensure user_id uniqueness

ALTER TABLE entrepreneurs 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS post VARCHAR(255),
  ADD COLUMN IF NOT EXISTS police_station VARCHAR(255),
  ADD COLUMN IF NOT EXISTS analysis_radius_km DECIMAL(5, 2) DEFAULT 10.0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entrepreneurs_user_unique ON entrepreneurs(user_id);
