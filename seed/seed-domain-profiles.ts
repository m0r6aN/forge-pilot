// seed/seed-domain-profiles.ts
//
// Seeds domain profiles into omega-postgres (PostgreSQL).
// Replaces the former Supabase-based seeder.
//
// Required env vars:
//   DATABASE_URL        — postgres connection string, e.g.
//                         postgresql://omega:omega_pg_password@localhost:5433/omega
//   SEED_SCHEMA_PATH    — path to domain JSON Schema file
//   SEED_PROFILES_DIR   — directory containing profile .json files
//
// Optional env vars:
//   OMEGA_FEDERATION_URL — if set (with OMEGA_API_KEY + OMEGA_TENANT_ID), active
//                          profiles are also synced to the omega-core FC registry
//                          (MongoDB cache) after postgres write.
//   OMEGA_API_KEY
//   OMEGA_TENANT_ID
//
// Usage:
//   DATABASE_URL=postgresql://omega:omega_pg_password@localhost:5433/omega \
//   SEED_SCHEMA_PATH=./seed/schema/domain.schema.v1.json \
//   SEED_PROFILES_DIR=./seed/profiles \
//   npx tsx seed/seed-domain-profiles.ts

import "dotenv/config";

import Ajv from "ajv";
import addFormats from "ajv-formats";
import stableStringify from "json-stable-stringify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

type DomainProfileV1 = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function canonicalJson(obj: unknown): string {
  const result = stableStringify(obj);
  if (result === undefined) {
    throw new Error(`Failed to generate canonical JSON: input was ${typeof obj}`);
  }
  return result;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

// ---------------------------------------------------------------------------
// Postgres helpers
// ---------------------------------------------------------------------------

async function upsertSchema(
  pool: pg.Pool,
  schemaId: string,
  schemaJson: unknown,
  schemaHash: string
): Promise<void> {
  await pool.query(
    `INSERT INTO domain_schema_versions (schema_id, json_schema, schema_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (schema_id) DO UPDATE
       SET json_schema  = EXCLUDED.json_schema,
           schema_hash  = EXCLUDED.schema_hash`,
    [schemaId, JSON.stringify(schemaJson), schemaHash]
  );
}

async function deprecateActiveProfiles(
  pool: pg.Pool,
  domainKey: string,
  schemaId: string
): Promise<void> {
  await pool.query(
    `UPDATE domain_profiles
     SET status = 'deprecated'
     WHERE domain_key = $1
       AND schema_id  = $2
       AND status     = 'active'`,
    [domainKey, schemaId]
  );
}

interface InsertedRow {
  profile_id: number;
}

interface ExistingRow {
  profile_id: number;
  payload_hash: string;
}

async function insertProfile(
  pool: pg.Pool,
  row: {
    domainKey: string;
    schemaId: string;
    profileVersion: string;
    source: string;
    archetypeId: string | null;
    displayName: string | null;
    payload: unknown;
    payloadHash: string;
  }
): Promise<{ inserted: boolean; profileId: number }> {
  try {
    const result = await pool.query<InsertedRow>(
      `INSERT INTO domain_profiles
         (domain_key, schema_id, profile_version, source, archetype_id, display_name,
          payload, payload_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING profile_id`,
      [
        row.domainKey,
        row.schemaId,
        row.profileVersion,
        row.source,
        row.archetypeId ?? null,
        row.displayName ?? null,
        JSON.stringify(row.payload),
        row.payloadHash,
      ]
    );
    return { inserted: true, profileId: result.rows[0].profile_id };
  } catch (err: unknown) {
    // Unique constraint violation on (domain_key, schema_id, profile_version)
    // means this version already exists — re-activate it.
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code !== "23505") {
      throw err;
    }

    const existing = await pool.query<ExistingRow>(
      `SELECT profile_id, payload_hash
       FROM domain_profiles
       WHERE domain_key      = $1
         AND schema_id       = $2
         AND profile_version = $3`,
      [row.domainKey, row.schemaId, row.profileVersion]
    );

    if (!existing.rows.length) {
      throw new Error(
        `Unique violation but row not found for ${row.domainKey}@${row.profileVersion}`
      );
    }

    const existing_row = existing.rows[0];

    if (existing_row.payload_hash !== row.payloadHash) {
      throw new Error(
        `Immutability violation: payload_hash mismatch for ` +
          `${row.domainKey}@${row.profileVersion}. Refusing to overwrite.`
      );
    }

    await pool.query(
      `UPDATE domain_profiles SET status = 'active' WHERE profile_id = $1`,
      [existing_row.profile_id]
    );

    return { inserted: false, profileId: existing_row.profile_id };
  }
}

// ---------------------------------------------------------------------------
// Optional: sync a profile to omega-core FC registry (MongoDB cache)
// ---------------------------------------------------------------------------

async function syncToFcRegistry(
  federationUrl: string,
  apiKey: string,
  tenantId: string,
  profile: DomainProfileV1,
  schemaId: string,
  payloadHash: string
): Promise<void> {
  const url = `${federationUrl}/api/fc/registry/domain-profiles`;
  // FC registry endpoint expects: { id, version, content, schema_id }
  const body = JSON.stringify({
    id: profile.domain_key,
    version: profile.profile_version ?? "1.0.0",
    content: profile,
    schema_id: schemaId,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Tenant-Id": tenantId,
      "X-Actor-Id": "seed-domain-profiles",
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`  ⚠  FC registry sync failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const schemaPath = process.env.SEED_SCHEMA_PATH;
  const profilesDir = process.env.SEED_PROFILES_DIR;

  if (!databaseUrl || !schemaPath || !profilesDir) {
    throw new Error(
      "Missing env vars. Required: DATABASE_URL, SEED_SCHEMA_PATH, SEED_PROFILES_DIR"
    );
  }

  const federationUrl = process.env.OMEGA_FEDERATION_URL?.trim() || null;
  const apiKey = process.env.OMEGA_API_KEY?.trim() || null;
  const tenantId = process.env.OMEGA_TENANT_ID?.trim() || null;
  const syncEnabled = !!(federationUrl && apiKey && tenantId);

  if (syncEnabled) {
    console.log(`FC registry sync enabled: ${federationUrl}`);
  }

  // Postgres connection
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // ── Validate connection ──────────────────────────────────────────────────
    await pool.query("SELECT 1");
    console.log("Connected to omega-postgres.\n");

    // ── Load + validate schema ───────────────────────────────────────────────
    const schemaJson = readJsonFile(schemaPath) as Record<string, unknown>;
    const schemaId: string =
      (schemaJson.$id as string) ||
      (schemaJson.schema_id as string) ||
      "domain.schema.v1";

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schemaJson);

    const schemaHash = sha256Hex(canonicalJson(schemaJson));

    console.log(`Schema   : ${schemaId}`);
    console.log(`Hash     : ${schemaHash}`);

    // ── Upsert schema registry row ───────────────────────────────────────────
    await upsertSchema(pool, schemaId, schemaJson, schemaHash);
    console.log("✅ domain_schema_versions upserted\n");

    // ── Load profile files ───────────────────────────────────────────────────
    const files = listJsonFiles(profilesDir);
    if (!files.length) {
      console.log(`No .json files found in ${profilesDir}`);
      return;
    }
    console.log(`Found ${files.length} profile file(s)\n`);

    // ── Seed each profile ────────────────────────────────────────────────────
    for (const filePath of files) {
      const filename = path.basename(filePath);
      const profile = readJsonFile(filePath) as DomainProfileV1;

      if (!profile?.domain_key || !profile?.profile_version) {
        throw new Error(
          `Profile missing domain_key/profile_version: ${filename}`
        );
      }

      // Pin schema_id
      if (profile.schema_id && profile.schema_id !== schemaId) {
        throw new Error(
          `schema_id mismatch in ${filename}: ` +
            `payload=${profile.schema_id}, expected=${schemaId}`
        );
      }
      profile.schema_id = schemaId;

      // JSON Schema validation
      if (!validate(profile)) {
        const errors = ajv.errorsText(validate.errors, { separator: "\n" });
        throw new Error(`Schema validation failed for ${filename}:\n${errors}`);
      }

      const payloadHash = sha256Hex(canonicalJson(profile));
      const domainKey = profile.domain_key as string;
      const profileVersion = profile.profile_version as string;
      const source = (profile.source as string) ?? "curated_seed";

      console.log(`→ ${domainKey}@${profileVersion}  (${filename})`);

      // Deprecate any existing active row for this (domain_key, schema_id)
      await deprecateActiveProfiles(pool, domainKey, schemaId);

      // Insert (or re-activate if identical version already exists)
      const { inserted, profileId } = await insertProfile(pool, {
        domainKey,
        schemaId,
        profileVersion,
        source,
        archetypeId: (profile.archetype_id as string) ?? null,
        displayName: (profile.display_name as string) ?? null,
        payload: profile,
        payloadHash,
      });

      if (inserted) {
        console.log(`  ✅ Inserted  profile_id=${profileId}`);
      } else {
        console.log(`  ✅ Reactivated profile_id=${profileId} (version existed, hash matched)`);
      }

      // Optional: sync active profile to FC registry (MongoDB cache)
      if (syncEnabled) {
        await syncToFcRegistry(
          federationUrl!,
          apiKey!,
          tenantId!,
          profile,
          schemaId,
          payloadHash
        );
        console.log(`  ✅ FC registry synced`);
      }
    }

    console.log("\n🎉 Seeding complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
