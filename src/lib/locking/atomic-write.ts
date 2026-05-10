import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { hashFile } from "./hash";

export interface WriteOp {
  targetPath: string;
  content: string;
  expectedHash: string | null;
}

export class ConflictError extends Error {
  constructor(public readonly path: string) {
    super(`Conflict: file was modified concurrently: ${path}`);
    this.name = "ConflictError";
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function atomicWrite(operations: WriteOp[]): Promise<void> {
  const tempPaths = new Map<string, string>();

  try {
    // Phase 1: write all to temp files
    for (const op of operations) {
      const tempPath = `${op.targetPath}.tmp.${randomId()}`;
      await fs.mkdir(dirname(op.targetPath), {
        recursive: true,
      });
      await fs.writeFile(tempPath, op.content, "utf-8");
      tempPaths.set(op.targetPath, tempPath);
    }

    // Phase 2: verify all hashes
    for (const op of operations) {
      const currentHash = await hashFile(op.targetPath);
      if (currentHash !== op.expectedHash) {
        throw new ConflictError(op.targetPath);
      }
    }

    // Phase 3: atomic rename all
    for (const [target, temp] of tempPaths) {
      await fs.rename(temp, target);
    }
  } catch (error) {
    for (const temp of tempPaths.values()) {
      await fs.unlink(temp).catch(() => {});
    }
    throw error;
  }
}
