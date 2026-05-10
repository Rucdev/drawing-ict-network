import { promises as fs } from "node:fs";

export async function hashFile(absolutePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(absolutePath);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex = Buffer.from(digest).toString("hex");
    return `sha256:${hex}`;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function currentHash(absolutePath: string): Promise<string> {
  const h = await hashFile(absolutePath);
  if (h === null) throw new Error(`File does not exist: ${absolutePath}`);
  return h;
}
