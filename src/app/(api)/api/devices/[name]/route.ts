import { type NextRequest, NextResponse } from "next/server";
import { ConflictError } from "@/lib/locking/atomic-write";
import { ValidationError, validateOrThrow } from "@/lib/schema/validator";
import { readCables } from "@/lib/yaml/cables";
import { deleteDevice, readDevice, writeDevice } from "@/lib/yaml/devices";
import type { Device } from "../../../../../../types/device";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const { data, version } = await readDevice(name);
    return NextResponse.json({ data, version });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const body = await req.json();
    const { data, expected_version } = body as {
      data: Device;
      expected_version: string;
    };

    validateOrThrow("device.schema.json", data);
    const newVersion = await writeDevice(name, data, expected_version);
    return NextResponse.json({ data, version: newVersion });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: "Conflict" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    // Check if any cables reference this device
    const { data: cablesFile } = await readCables();
    const referenced = cablesFile.cables.some((c) =>
      c.endpoints.some((ep) => ep.startsWith(`${name}:`))
    );
    if (referenced) {
      return NextResponse.json(
        {
          error: `Device '${name}' is referenced by cables. Remove cables first.`,
        },
        { status: 409 }
      );
    }

    await deleteDevice(name);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
