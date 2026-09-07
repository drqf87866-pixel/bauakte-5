-- Trennt Tags in manuelle und KI-generierte.
-- Backfill: ai_tags = tags (feingranular ist verloren, akzeptabel),
-- manual_tags bleibt leer (nur newly entered Tags werden getrackt).

ALTER TABLE uploads ADD COLUMN manual_tags TEXT NOT NULL DEFAULT '';
ALTER TABLE uploads ADD COLUMN ai_tags     TEXT NOT NULL DEFAULT '';

-- Zurückspielen bestehender Daten: alle bisherigen Tags als KI-Tags behandeln
UPDATE uploads SET ai_tags = tags
  WHERE type = 'image' AND tag_status = 'done' AND tags != '';
