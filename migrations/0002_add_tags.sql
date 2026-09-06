-- Add tags column to uploads table for AI auto-tagging
ALTER TABLE uploads ADD COLUMN tags TEXT NOT NULL DEFAULT '';
