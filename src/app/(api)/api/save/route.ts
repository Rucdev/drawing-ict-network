import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { stringify } from "yaml";
import { atomicWrite, ConflictError, type WriteOp } from "@/lib/locking/atomic-write";
import { hashFile } from "@/lib/locking/hash";
import { createBackend } from "@/lib/persistence/backend";
import { checkReferenceIntegrity } from "@/lib/schema/reference-integrity";
import { ValidationError, validateOrThrow } from "@/lib/schema/validator";
import { cablesFilePath } from "@/lib/yaml/cables";
import { deviceDir } from "@/lib/yaml/devices";
import type { CablesFile } from "../../../../../types/cables-file";
import type { Device } from "../../../../../types/device";
import type { Layout } from "../../../../../types/layout";
import type { PortsFile } from "../../../../../types/ports-file";

interface DeviceSaveItem {
  device: Device;
  ports: PortsFile;
  layout: Layout;
  deviceVersion: string | null;
  portsVersion: string | null;
  layoutVersion: string | null;
}

interface SaveRequest {
  devices: DeviceSaveItem[];
  cables: {
    data: CablesFile;
    version: string | null;
  };
  commitMessage?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveRequest;

    // Validate all entities
    for (const item of body.devices) {
      validateOrThrow("device.schema.json", item.device);
      validateOrThrow("ports-file.schema.json", item.ports);
      validateOrThrow("layout.schema.json", item.layout);
    }
    validateOrThrow("cables-file.schema.json", body.cables.data);

    // Reference integrity check
    const devicesWithPorts = body.devices.map((item) => ({
      device: item.device,
      ports: item.ports.ports,
    }));
    const integrityErrors = checkReferenceIntegrity(devicesWithPorts, body.cables.data.cables);
    if (integrityErrors.length > 0) {
      return NextResponse.json({ errors: integrityErrors }, { status: 422 });
    }

    // Build all WriteOps
    const ops: WriteOp[] = [];
    const changedFiles: string[] = [];

    for (const item of body.devices) {
      const dir = deviceDir(item.device.name);

      const devicePath = join(dir, "device.yaml");
      ops.push({
        targetPath: devicePath,
        content: stringify(item.device),
        expectedHash: item.deviceVersion,
      });
      changedFiles.push(devicePath);

      const portsPath = join(dir, "ports.yaml");
      ops.push({
        targetPath: portsPath,
        content: stringify(item.ports),
        expectedHash: item.portsVersion,
      });
      changedFiles.push(portsPath);

      const layoutPath = join(dir, "layout.yaml");
      ops.push({
        targetPath: layoutPath,
        content: stringify(item.layout),
        expectedHash: item.layoutVersion,
      });
      changedFiles.push(layoutPath);
    }

    const cablesPath = cablesFilePath();
    ops.push({
      targetPath: cablesPath,
      content: stringify(body.cables.data),
      expectedHash: body.cables.version,
    });
    changedFiles.push(cablesPath);

    await atomicWrite(ops);

    // Collect new versions
    const newVersions: Record<string, string> = {};
    for (const file of changedFiles) {
      const hash = await hashFile(file);
      if (hash) newVersions[file] = hash;
    }

    const backend = await createBackend();
    await backend.afterSave(changedFiles, body.commitMessage);

    return NextResponse.json({ ok: true, newVersions });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: "Conflict: file was modified concurrently. Please reload." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
