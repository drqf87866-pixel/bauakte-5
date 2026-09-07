-- Add AI metadata columns to uploads for auto-tagging status & description
ALTER TABLE uploads ADD COLUMN ai_description TEXT NOT NULL DEFAULT '';
ALTER TABLE uploads ADD COLUMN tag_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE uploads ADD COLUMN tag_error TEXT NOT NULL DEFAULT '';

-- Backfill existing rows based on current state
UPDATE uploads SET tag_status = 'done'
  WHERE tag_status = 'none' AND type = 'image' AND tags IS NOT NULL AND tags != '';
UPDATE uploads SET tag_status = 'pending'
  WHERE tag_status = 'none' AND type = 'image' AND (tags IS NULL OR tags = '');
