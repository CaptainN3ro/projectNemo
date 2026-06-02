-- update.sql — runs when the same plugin is re-uploaded (version update).
-- It is executed BEFORE the new plugin files are swapped in.
-- IMPORTANT: Write every statement idempotently (safe to run multiple times).

-- Example: add pet_id column to link notes to a specific pet (v1.0 → v1.1)
-- MySQL 8 supports IF NOT EXISTS for ADD COLUMN, so this is safe to re-run.
ALTER TABLE example_notes
  ADD COLUMN IF NOT EXISTS pet_id INT NULL;

-- Example: add an index for performance (IF NOT EXISTS requires MySQL 8.0.29+;
-- for older versions wrap in a stored procedure or check information_schema first)
-- CREATE INDEX IF NOT EXISTS idx_example_notes_pet ON example_notes (pet_id);
