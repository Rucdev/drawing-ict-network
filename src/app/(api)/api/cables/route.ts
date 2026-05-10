import { type NextRequest, NextResponse } from "next/server";
import { ConflictError } from "@/lib/locking/atomic-write";
import { checkReferenceIntegrity } from "@/lib/schema/reference-integrity";
import { ValidationError, validateOrThrow } from "@/lib/schema/validator";
import { readCables, writeCables } from "@/lib/yaml/cables";
import { listDeviceNames, readPorts } from "@/lib/yaml/devices";
import type { CablesFile } from "../../../../../types/cables-file";

export async function GET() {
  try {
    const { data, version } = await readCables();
    return NextResponse.json({ data, version });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, expected_version } = body as {
      data: CablesFile;
      expected_version: string | null;
    };

    validateOrThrow("cables-file.schema.json", data);

    const names = await listDeviceNames();
    const devices = await Promise.all(
      names.map(async (name) => {
        const { data: portsFile } = await readPorts(name);
        return { device: { name, role: "", vendor: "", model: "" }, ports: portsFile.ports };
      })
    );

    const integrityErrors = checkReferenceIntegrity(devices, data.cables);
    if (integrityErrors.length > 0) {
      return NextResponse.json({ errors: integrityErrors }, { status: 422 });
    }

    const newVersion = await writeCables(data, expected_version);
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
