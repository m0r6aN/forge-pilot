// evidenceEmitter.ts

import { BlobServiceClient } from "@azure/storage-blob";
import { createHash } from "crypto";
import fs from "fs";
import { ulid } from "ulid";

export type SuiteType =
  | "smoke" | "unit" | "contract" | "integration"
  | "e2e" | "chaos" | "perf" | "obs";

export interface EvidenceRunDescriptor {
  env: string;
  layer: string;
  suite: SuiteType;
  scenarioId: string;
  storage: { container: string };
  source: {
    git: { sha: string; repo?: string; branch?: string; tag?: string };
    build: { system: string; buildId?: string; runNumber?: string; pipeline?: string; job?: string };
  };
  context?: Record<string, any>;
}

interface ArtifactDescriptor {
  name: string;
  blobUrl: string;
  sha256: string;
  contentType?: string;
  bytes?: number;
}

export class EvidenceEmitter {
  private blobService: BlobServiceClient;

  constructor(connectionString: string) {
    this.blobService = BlobServiceClient.fromConnectionString(connectionString);
  }

  async beginRun(descriptor: EvidenceRunDescriptor) {
    const runId = `run_${ulid()}`;
    const timestamp = new Date().toISOString();

    const prefix = `${descriptor.env}/${descriptor.layer}/${descriptor.suite}/${descriptor.scenarioId}/${runId}`;

    const containerClient = this.blobService.getContainerClient(descriptor.storage.container);

    return {
      descriptor,
      runId,
      timestamp,
      prefix,
      containerClient,
      artifacts: [] as ArtifactDescriptor[],
      assertions: [],
      metrics: {},
      status: "pass" as "pass" | "fail" | "skip" | "abort",
      failure: undefined as any
    };
  }

  async emitArtifact(handle: any, name: string, filePath: string, contentType?: string) {
    const bytes = fs.readFileSync(filePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const blockBlob = handle.containerClient.getBlockBlobClient(`${handle.prefix}/${name}`);
    await blockBlob.uploadData(bytes, { blobHTTPHeaders: { blobContentType: contentType } });

    const descriptor: ArtifactDescriptor = {
      name,
      blobUrl: blockBlob.url,
      sha256,
      contentType,
      bytes: bytes.length
    };

    handle.artifacts.push(descriptor);
    return descriptor;
  }

  recordAssertion(handle: any, assertion: { id: string; status: string; message?: string }) {
    handle.assertions = handle.assertions.filter((a: any) => a.id !== assertion.id);
    handle.assertions.push(assertion);
  }

  setStatus(handle: any, status: any, failure?: any) {
    handle.status = status;
    handle.failure = failure;
  }

  async finalizeRun(handle: any) {
    const manifest = {
      schemaVersion: "v1.0.0",
      runId: handle.runId,
      timestamp: handle.timestamp,
      env: handle.descriptor.env,
      layer: handle.descriptor.layer,
      suite: handle.descriptor.suite,
      scenarioId: handle.descriptor.scenarioId,
      status: handle.status,
      source: handle.descriptor.source,
      context: handle.descriptor.context,
      assertions: handle.assertions,
      metrics: handle.metrics,
      failure: handle.failure,
      evidence: {
        storage: {
          account: "keonreceipts",
          container: handle.descriptor.storage.container,
          prefix: handle.prefix
        },
        artifacts: handle.artifacts
      }
    };

    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
    const sha256 = createHash("sha256").update(manifestBytes).digest("hex");

    const manifestBlob = handle.containerClient.getBlockBlobClient(`${handle.prefix}/run_manifest.json`);
    await manifestBlob.uploadData(manifestBytes, {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });

    return { runId: handle.runId, manifestUrl: manifestBlob.url, sha256 };
  }
}
