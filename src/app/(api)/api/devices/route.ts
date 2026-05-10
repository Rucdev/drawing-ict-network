import { promises as fs } from "node:fs";
import { type NextRequest, NextResponse } from "next/server";
import { ValidationError, validateOrThrow } from "@/lib/schema/validator";
import {
  createDeviceFiles,
  deviceDir,
  listDeviceNames,
  readDevice,
  readLayout,
  readPorts,
} from "@/lib/yaml/devices";
import type { Device } from "../../../../../types/device";
import type { PortsFile } from "../../../../../types/ports-file";

export async function GET() {
  try {
    const names = await listDeviceNames();
    const devices = await Promise.all(
      names.map(async (name) => {
        const { data: device, version } = await readDevice(name);
        const { data: portsFile, version: portsVersion } = await readPorts(name);
        const { data: layout, version: layoutVersion } = await readLayout(name);
        const position = layout.positions?.default ?? { x: 100, y: 100 };
        return { device, ports: portsFile.ports, version, portsVersion, layoutVersion, position };
      })
    );
    return NextResponse.json({ devices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { device, ports } = body as { device: Device; ports: PortsFile };

    validateOrThrow("device.schema.json", device);
    validateOrThrow("ports-file.schema.json", ports);

    // Check if device already exists
    try {
      await fs.access(deviceDir(device.name));
      return NextResponse.json(
        { error: `Device '${device.name}' already exists` },
        { status: 409 }
      );
    } catch {
      // Does not exist — proceed
    }

    await createDeviceFiles(device, ports);
    const { version } = await readDevice(device.name);
    return NextResponse.json({ device, ports, version }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
