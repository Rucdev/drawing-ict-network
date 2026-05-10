import { promises as fs } from "node:fs";
import { parse } from "yaml";

export async function readYamlFile<T>(absolutePath: string): Promise<T> {
  const text = await fs.readFile(absolutePath, "utf-8");
  return parse(text) as T;
}

export async function readYamlFileSafe<T>(absolutePath: string): Promise<T | null> {
  try {
    return await readYamlFile<T>(absolutePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
