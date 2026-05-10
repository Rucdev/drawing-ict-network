import { type NextRequest, NextResponse } from "next/server";
import { ConflictError } from "@/lib/locking/atomic-write";
import { ValidationError, validateOrThrow } from "@/lib/schema/validator";
import { readPorts, writePorts } from "@/lib/yaml/devices";
import type { PortsFile } from "../../../../../../../types/ports-file";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const { data, version } = await readPorts(name);
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
      data: PortsFile;
      expected_version: string;
    };

    validateOrThrow("ports-file.schema.json", data);
    const newVersion = await writePorts(name, data, expected_version);
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
