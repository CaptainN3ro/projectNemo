-- Drop in reverse dependency order.
-- The pet_id column added by update.sql is automatically removed when the
-- table is dropped — no separate ALTER TABLE needed here.
DROP TABLE IF EXISTS example_notes;
DROP TABLE IF EXISTS example_plugin_settings;
