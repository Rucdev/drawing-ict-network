import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, unknown>();

export function loadSchema(name: string): unknown {
  if (cache.has(name)) return cache.get(name);
  const schemaDir = join(process.cwd(), "schema");
  const raw = readFileSync(join(schemaDir, `${name}.schema.json`), "utf-8");
  const schema = JSON.parse(raw);
  cache.set(name, schema);
  return schema;
}
