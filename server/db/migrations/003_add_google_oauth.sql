-- Migration: Add Google OAuth fields to users table
-- Run this once against your InsForge/Postgres database

-- Allow password_hash to be NULL (Google users have no password)
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

-- Add google_id column for linking Google accounts
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Add avatar column to store Google profile picture URL
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar TEXT;
