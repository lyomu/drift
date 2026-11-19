-- User management foundation:
--   1. users.lastActiveAt            (throttled activity signal, null = never)
--   2. coach_profiles listing suspension (independent of account status)
--   3. admin_audit_logs: reason + tamper-evident hash chain + append-only

-- ---------------------------------------------------------------- activity
ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
CREATE INDEX "users_lastActiveAt_idx" ON "users"("lastActiveAt");

-- ---------------------------------------------------------- coach listings
ALTER TABLE "coach_profiles"
  ADD COLUMN "listingSuspendedAt" TIMESTAMP(3),
  ADD COLUMN "listingSuspendedReason" TEXT;

-- ------------------------------------------------------------- audit trail
ALTER TABLE "admin_audit_logs"
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "seq" INTEGER,
  ADD COLUMN "prevHash" TEXT,
  ADD COLUMN "hash" TEXT;

CREATE UNIQUE INDEX "admin_audit_logs_seq_key" ON "admin_audit_logs"("seq");

-- The log is append-only, so an admin that has history can no longer be
-- cascade-deleted out from under it.
ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_actorId_fkey";
ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "platform_admins"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- INTEGER (not BIGINT) so the column maps to a JS number: Prisma returns BigInt
-- for BIGINT and JSON.stringify throws on it in every `include` that reads
-- this table. 2 billion admin actions is not a practical ceiling.
CREATE SEQUENCE "admin_audit_logs_seq_seq" AS INTEGER;

-- Single definition of what is hashed; used by both the insert trigger and the
-- verifier so they cannot drift. createdAt is stored as UTC timestamp(3).
CREATE FUNCTION admin_audit_row_hash(prev TEXT, r admin_audit_logs)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(
    sha256(convert_to(
      concat_ws('|',
        coalesce(prev, ''),
        r."id",
        r."actorId",
        r."action",
        r."entityType",
        r."entityId",
        coalesce(r."reason", ''),
        coalesce(r."metadata"::text, ''),
        to_char(r."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS')
      ), 'UTF8')),
    'hex')
$$;

-- Chains every insert, whichever code path wrote it. The advisory lock
-- serialises writers so "previous row" is well-defined, and seq is assigned
-- after the lock so seq order == chain order.
CREATE FUNCTION admin_audit_chain() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_hash TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(727001);
  SELECT "hash" INTO last_hash
    FROM "admin_audit_logs"
   WHERE "hash" IS NOT NULL
   ORDER BY "seq" DESC
   LIMIT 1;
  NEW."seq" := nextval('"admin_audit_logs_seq_seq"');
  NEW."prevHash" := last_hash;
  NEW."hash" := admin_audit_row_hash(last_hash, NEW);
  RETURN NEW;
END $$;

CREATE TRIGGER admin_audit_logs_chain
  BEFORE INSERT ON "admin_audit_logs"
  FOR EACH ROW EXECUTE FUNCTION admin_audit_chain();

CREATE FUNCTION admin_audit_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is append-only (% blocked)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER admin_audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON "admin_audit_logs"
  FOR EACH ROW EXECUTE FUNCTION admin_audit_immutable();

CREATE TRIGGER admin_audit_logs_no_truncate
  BEFORE TRUNCATE ON "admin_audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION admin_audit_immutable();

-- Walks the chain in seq order. Returns rows checked, legacy (unchained) rows,
-- and the id of the first row whose link or hash does not match.
CREATE FUNCTION admin_audit_verify()
RETURNS TABLE (checked BIGINT, legacy BIGINT, first_broken_id TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r admin_audit_logs;
  prev TEXT := NULL;
  n BIGINT := 0;
  bad TEXT := NULL;
BEGIN
  SELECT count(*) INTO legacy FROM "admin_audit_logs" WHERE "hash" IS NULL;
  FOR r IN
    SELECT * FROM "admin_audit_logs" WHERE "hash" IS NOT NULL ORDER BY "seq"
  LOOP
    IF r."prevHash" IS DISTINCT FROM prev
       OR r."hash" <> admin_audit_row_hash(prev, r) THEN
      bad := r."id";
      EXIT;
    END IF;
    prev := r."hash";
    n := n + 1;
  END LOOP;
  checked := n;
  first_broken_id := bad;
  RETURN NEXT;
END $$;
