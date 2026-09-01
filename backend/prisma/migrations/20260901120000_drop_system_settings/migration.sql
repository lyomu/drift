-- Drop the SystemSetting table and its enum.
--
-- The table was write-only: the platform-admin console could create and edit
-- rows, but no service ever read one back, so no setting could change any
-- behaviour. Real global knobs (e.g. MAX_PROPOSAL_ROUNDS) live as constants in
-- code, sourced from the foundation docs.
DROP TABLE IF EXISTS "system_settings";

DROP TYPE IF EXISTS "PlatformSystemSettingType";
