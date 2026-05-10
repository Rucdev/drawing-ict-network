import { join } from "node:path";
import { stringify } from "yaml";
import type { CablesFile } from "../../../types/cables-file";
import { atomicWrite } from "../locking/atomic-write";
import { currentHash, hashFile } from "../locking/hash";
import { readYamlFileSafe } from "./reader";
import { getWorkspacePath } from "./workspace";

export function cablesFilePath(): string {
  return join(getWorkspacePath(), "links", "cables", "default", "cables.yaml");
}

export async function readCables(): Promise<{
  data: CablesFile;
  version: string | null;
}> {
  const path = cablesFilePath();
  const data = await readYamlFileSafe<CablesFile>(path);
  if (!data) return { data: { cables: [] }, version: null };
  const version = await hashFile(path);
  return { data, version };
}

export async function writeCables(
  data: CablesFile,
  expectedVersion: string | null
): Promise<string> {
  const path = cablesFilePath();
  await atomicWrite([
    { targetPath: path, content: stringify(data), expectedHash: expectedVersion },
  ]);
  return currentHash(path);
}
