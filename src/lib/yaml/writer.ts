import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { stringify } from "yaml";

export async function writeYamlFile(absolutePath: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, stringify(data), "utf-8");
}
