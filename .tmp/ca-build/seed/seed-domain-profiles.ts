// seed/seed-domain-profiles.ts
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import stableStringify from "json-stable-stringify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type DomainProfileV1 = Record<string, any>;

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function canonicalJson(obj: unknown): string {
  // Deterministic JSON representation (key-sorted)
  const result = stableStringify(obj);
  
  if (result === undefined) {
    throw new Error(`Failed to generate canonical JSON: Input was ${typeof obj}`);
  }
  
  return result;
}

function readJsonFile(filePath: string): any {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function listJsonFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schemaPath = process.env.SEED_SCHEMA_PATH;
  const profilesDir = process.env.SEED_PROFILES_DIR;

  if (!supabaseUrl || !serviceRoleKey || !schemaPath || !profilesDir) {
    throw new Error(
      "Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_SCHEMA_PATH, SEED_PROFILES_DIR"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Load and prep schema validation
  const schemaJson = readJsonFile(schemaPath);
  const schemaId: string =
    schemaJson?.$id || schemaJson?.schema_id || "domain.schema.v1";

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schemaJson);

  const schemaHash = sha256Hex(canonicalJson(schemaJson));

  console.log(`Using schema_id=${schemaId}`);
  console.log(`Schema hash=${schemaHash}`);

  // 1) Ensure schema registry row exists (upsert)
  {
    const { error } = await supabase.from("domain_schema_versions").upsert(
      {
        schema_id: schemaId,
        json_schema: schemaJson,
        schema_hash: schemaHash,
      },
      { onConflict: "schema_id" }
    );

    if (error) throw new Error(`Schema upsert failed: ${error.message}`);
    console.log("✅ domain_schema_versions upserted");
  }

  // 2) Load profile files
  const files = listJsonFiles(profilesDir);
  if (!files.length) {
    console.log(`No .json files found in ${profilesDir}`);
    return;
  }

  console.log(`Found ${files.length} profile files`);

  // 3) Seed each profile
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const profile: DomainProfileV1 = readJsonFile(filePath);

    // Basic sanity
    if (!profile?.domain_key || !profile?.profile_version) {
      throw new Error(
        `Profile missing domain_key/profile_version: ${filename}`
      );
    }

    // Enforce schema_id in the payload matches the pinned schema row
    if (profile.schema_id && profile.schema_id !== schemaId) {
      throw new Error(
        `schema_id mismatch in ${filename}: payload=${profile.schema_id}, expected=${schemaId}`
      );
    }
    profile.schema_id = schemaId;

    // Validate JSON against schema
    const ok = validate(profile);
    if (!ok) {
      const errors = ajv.errorsText(validate.errors, { separator: "\n" });
      throw new Error(`Schema validation failed for ${filename}:\n${errors}`);
    }

    const payloadCanonical = canonicalJson(profile);
    const payloadHash = sha256Hex(payloadCanonical);

    const domainKey: string = profile.domain_key;
    const profileVersion: string = profile.profile_version;
    const source: string = profile.source ?? "curated_seed";

    // If we are inserting an "active" version, ensure any existing active becomes deprecated
    // (assumes your table has the unique partial index for active rows)
    const desiredStatus = "active";

    console.log(
      `\n→ Seeding ${domainKey}@${profileVersion} (${source}) from ${filename}`
    );

    // Deprecate any existing active for domain_key + schema_id
    {
      const { error } = await supabase
        .from("domain_profiles")
        .update({ status: "deprecated" })
        .eq("domain_key", domainKey)
        .eq("schema_id", schemaId)
        .eq("status", "active");

      if (error) {
        throw new Error(
          `Failed to deprecate existing active for ${domainKey}: ${error.message}`
        );
      }
    }

    // Insert this version
    // If it already exists (same version), we keep it immutable: do NOT update payload.
    // We’ll attempt insert; on conflict, we’ll just re-activate it (status) if needed.
    const insertRow = {
      domain_key: domainKey,
      schema_id: schemaId,
      profile_version: profileVersion,
      source,
      archetype_id: profile.archetype_id,
      display_name: profile.display_name,
      payload: profile,
      payload_hash: payloadHash,
      status: desiredStatus,
      supersedes_profile_id: null as number | null,
      receipt_hash: null as string | null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("domain_profiles")
      .insert(insertRow)
      .select("profile_id")
      .maybeSingle();

    if (insertErr) {
      // Handle version already exists (immutable): just re-activate that row
      // NOTE: Supabase error codes vary; simplest is to try fetch+activate.
      console.warn(
        `Insert failed for ${domainKey}@${profileVersion} (maybe exists): ${insertErr.message}`
      );

      const { data: existing, error: fetchErr } = await supabase
        .from("domain_profiles")
        .select("profile_id,payload_hash")
        .eq("domain_key", domainKey)
        .eq("schema_id", schemaId)
        .eq("profile_version", profileVersion)
        .maybeSingle();

      if (fetchErr || !existing) {
        throw new Error(
          `Could not fetch existing row after insert failure for ${domainKey}@${profileVersion}: ${
            fetchErr?.message ?? "not found"
          }`
        );
      }

      // Safety: ensure payload hash matches (immutability guard)
      if (existing.payload_hash !== payloadHash) {
        throw new Error(
          `Immutability violation: existing payload_hash differs for ${domainKey}@${profileVersion}. Refusing to overwrite.`
        );
      }

      // Reactivate existing row
      const { error: reactErr } = await supabase
        .from("domain_profiles")
        .update({ status: "active" })
        .eq("profile_id", existing.profile_id);

      if (reactErr) {
        throw new Error(
          `Failed to reactivate existing row for ${domainKey}@${profileVersion}: ${reactErr.message}`
        );
      }

      console.log(`✅ Reactivated existing ${domainKey}@${profileVersion}`);
    } else {
      console.log(`✅ Inserted profile_id=${inserted?.profile_id ?? "?"}`);
    }
  }

  console.log("\n🎉 Seeding complete.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
