import { promises as fs } from "node:fs";
import { join } from "node:path";
import { getWorkspacePath } from "../yaml/workspace";

let _cached: boolean | null = null;

export async function isGitWorkspace(): Promise<boolean> {
  if (_cached !== null) return _cached;
  try {
    await fs.access(join(getWorkspacePath(), ".git"));
    _cached = true;
  } catch {
    _cached = false;
  }
  return _cached;
}
