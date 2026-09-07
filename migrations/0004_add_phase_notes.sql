-- Add per-phase notes (free-form text written by the user)
ALTER TABLE phases ADD COLUMN notes TEXT NOT NULL DEFAULT '';
